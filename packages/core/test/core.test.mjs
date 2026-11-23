import test from "node:test";
import assert from "node:assert/strict";
import { KbEventBus, KbMemoryManager, KBVerseCore, KbModuleRegistry, KbTaskScheduler, KbResourceManager, KbDataManager } from "../dist/index.js";

test("EventBus: đăng ký, phát và tự hủy listener once", () => {
  const bus = new KbEventBus();
  let count = 0;

  bus.once("test:event", () => count++);
  bus.emit("test:event");
  bus.emit("test:event");

  assert.equal(count, 1);
});

test("MemoryManager: cấp phát, giới hạn và giải phóng bộ nhớ", () => {
  const memory = new KbMemoryManager(1024);
  memory.setCategoryLimit("texture", 512);

  memory.allocate("texture-1", "renderer", 256, "texture");

  assert.equal(memory.getUsage().allocatedBytes, 256);
  assert.equal(memory.getCategoryUsage("texture"), 256);
  assert.equal(memory.release("texture-1"), true);
  assert.equal(memory.getUsage().allocatedBytes, 0);
});

test("Core: khởi tạo, chạy, dừng và khởi động lại", async () => {
  const core = new KBVerseCore();
  let starts = 0;
  let stops = 0;

  core.register({
    id: "test-module",
    version: "1.0.0",
    initialize() {},
    start() {
      starts++;
    },
    stop() {
      stops++;
    }
  });

  await core.initialize();
  await core.start();
  assert.equal(core.isRunning, true);

  await core.stop();
  assert.equal(core.isInitialized, false);

  await core.initialize();
  await core.start();

  assert.equal(starts, 2);

  await core.stop();
  assert.equal(stops, 2);
});

test("ModuleRegistry: từ chối ID trùng và bảo vệ dependency", async () => {
  const registry = new KbModuleRegistry();

  registry.register({ id: "base", version: "1.0.0" });
  registry.register({
    id: "child",
    version: "1.0.0",
    dependencies: ["base"]
  });

  assert.throws(
    () => registry.register({ id: "base", version: "2.0.0" }),
    /already registered/i
  );

  await assert.rejects(
    registry.unregister("base"),
    /required by/i
  );

  assert.equal(registry.get("base") !== undefined, true);
});

test("Lifecycle: khởi tạo theo dependency, dừng theo thứ tự ngược", async () => {
  const core = new KBVerseCore();
  const order = [];

  core.register({
    id: "base",
    version: "1.0.0",
    initialize: () => order.push("init:base"),
    start: () => order.push("start:base"),
    stop: () => order.push("stop:base")
  });

  core.register({
    id: "child",
    version: "1.0.0",
    dependencies: ["base"],
    initialize: () => order.push("init:child"),
    start: () => order.push("start:child"),
    stop: () => order.push("stop:child")
  });

  await core.initialize();
  await core.start();
  await core.stop();

  assert.deepEqual(order, [
    "init:base",
    "init:child",
    "start:base",
    "start:child",
    "stop:child",
    "stop:base"
  ]);
});

test("Lifecycle: rollback module đã initialize khi module sau thất bại", async () => {
  const core = new KBVerseCore();
  const order = [];

  core.register({
    id: "first",
    version: "1.0.0",
    initialize: () => order.push("init:first"),
    stop: () => order.push("rollback:first")
  });

  core.register({
    id: "second",
    version: "1.0.0",
    dependencies: ["first"],
    initialize: () => {
      throw new Error("Initialization failure");
    }
  });

  await assert.rejects(core.initialize(), (error) => error.cause?.message === "Initialization failure");

  assert.deepEqual(order, [
    "init:first",
    "rollback:first"
  ]);
  assert.equal(core.isInitialized, false);
});





test("TaskScheduler: thực thi task và cập nhật trạng thái", async () => {
  const scheduler = new KbTaskScheduler(2);

  const task = scheduler.schedule("test-task", async () => 42);
  assert.equal(await task.promise, 42);
  assert.equal(scheduler.get(task.id)?.status, "completed");

  await scheduler.shutdown();
});

test("ResourceManager: giải phóng tài nguyên và gọi disposer", async () => {
  const resources = new KbResourceManager();
  let disposed = false;

  resources.register("resource-1", "test", { value: 42 }, () => {
    disposed = true;
  });

  assert.equal(resources.get("resource-1")?.value, 42);
  assert.equal(await resources.release("resource-1"), true);
  assert.equal(disposed, true);
  assert.equal(resources.has("resource-1"), false);
});

test("DataManager: lưu, đọc và xóa dữ liệu", () => {
  const data = new KbDataManager();

  data.set("player", "level", 15);
  assert.equal(data.get("player", "level"), 15);
  assert.equal(data.has("player", "level"), true);

  assert.equal(data.delete("player", "level"), true);
  assert.equal(data.has("player", "level"), false);
});

test("TaskScheduler: giới hạn concurrency", async () => {
  const scheduler = new KbTaskScheduler(2);
  let active = 0;
  let maximumActive = 0;

  const createTask = (name) => scheduler.schedule(name, async () => {
    active++;
    maximumActive = Math.max(maximumActive, active);

    await new Promise((resolve) => setTimeout(resolve, 30));

    active--;
  });

  const tasks = [
    createTask("task-1"),
    createTask("task-2"),
    createTask("task-3"),
    createTask("task-4")
  ];

  await Promise.all(tasks.map((task) => task.promise));

  assert.equal(maximumActive, 2);
  await scheduler.shutdown();
});

test("TaskScheduler: hủy task đang chờ", async () => {
  const scheduler = new KbTaskScheduler(1);

  let releaseFirst;
  const first = scheduler.schedule("first", () =>
    new Promise((resolve) => {
      releaseFirst = resolve;
    })
  );

  const second = scheduler.schedule("second", () => "completed");
  second.cancel();

  await assert.rejects(second.promise, /cancelled/i);
  assert.equal(scheduler.get(second.id)?.status, "cancelled");

  releaseFirst();
  await first.promise;
  await scheduler.shutdown();
});

test("TaskScheduler: ưu tiên task có priority cao hơn", async () => {
  const scheduler = new KbTaskScheduler(1);

  let releaseFirst;
  const order = [];

  const first = scheduler.schedule("blocking", () =>
    new Promise((resolve) => {
      releaseFirst = resolve;
    })
  );

  const low = scheduler.schedule("low", () => order.push("low"), {
    priority: "low"
  });

  const critical = scheduler.schedule("critical", () => order.push("critical"), {
    priority: "critical"
  });

  await new Promise((resolve) => setTimeout(resolve, 10));
  releaseFirst();

  await Promise.all([first.promise, low.promise, critical.promise]);

  assert.deepEqual(order, ["critical", "low"]);
  await scheduler.shutdown();
});

test("ResourceManager: giữ tài nguyên khi disposer thất bại và cho phép retry", async () => {
  const resources = new KbResourceManager();
  let attempts = 0;

  resources.register("retry-resource", "test", {}, () => {
    attempts++;
    if (attempts === 1) throw new Error("Temporary cleanup failure");
  });

  await assert.rejects(resources.release("retry-resource"));
  assert.equal(resources.has("retry-resource"), true);

  assert.equal(await resources.release("retry-resource"), true);
  assert.equal(attempts, 2);
  assert.equal(resources.has("retry-resource"), false);
});

test("ResourceManager: releaseAll tiếp tục cleanup sau lỗi", async () => {
  const resources = new KbResourceManager();
  const disposed = [];

  resources.register("first", "test", {}, () => disposed.push("first"));
  resources.register("second", "test", {}, () => {
    throw new Error("Cleanup failure");
  });
  resources.register("third", "test", {}, () => disposed.push("third"));

  await assert.rejects(resources.releaseAll(), AggregateError);

  assert.deepEqual(disposed, ["third", "first"]);
  assert.equal(resources.has("second"), true);
  assert.equal(resources.has("first"), false);
  assert.equal(resources.has("third"), false);
});

test("DataManager: snapshot và restore dữ liệu", () => {
  const data = new KbDataManager();

  data.set("player", "level", 15);
  data.set("player", "xp", 1200);

  const snapshot = data.snapshot();

  data.set("player", "level", 99);
  data.delete("player", "xp");
  data.set("settings", "volume", 50);

  data.restore(snapshot);

  assert.equal(data.get("player", "level"), 15);
  assert.equal(data.get("player", "xp"), 1200);
  assert.equal(data.has("settings", "volume"), false);
});

test("DataManager: clear namespace không ảnh hưởng namespace khác", () => {
  const data = new KbDataManager();

  data.set("player", "level", 15);
  data.set("settings", "volume", 50);

  data.clear("player");

  assert.equal(data.has("player", "level"), false);
  assert.equal(data.get("settings", "volume"), 50);
});

test("TaskScheduler: shutdown timeout khi task bỏ qua AbortSignal", async () => {
  const scheduler = new KbTaskScheduler(1);
  let releaseTask;

  const task = scheduler.schedule("unresponsive-task", () =>
    new Promise((resolve) => {
      releaseTask = resolve;
    })
  );

  await assert.rejects(
    scheduler.shutdown(20),
    /shutdown timed out/i
  );

  assert.equal(scheduler.get(task.id)?.status, "running");

  releaseTask();

  await assert.rejects(task.promise, /cancelled/i);
  await scheduler.shutdown(100);
});

test("ResourceManager: khóa thao tác sau dispose", async () => {
  const resources = new KbResourceManager();

  resources.register("item", "test", { value: 1 });
  await resources.dispose();

  assert.equal(resources.size, 0);
  assert.equal(resources.has("item"), false);
  assert.deepEqual(resources.list(), []);

  assert.throws(
    () => resources.register("new", "test", {}),
    /disposed/i
  );

  assert.throws(
    () => resources.get("item"),
    /disposed/i
  );

  await assert.rejects(resources.release("item"), /disposed/i);
  await assert.rejects(resources.releaseAll(), /disposed/i);

  await resources.dispose();
});

test("DataManager: snapshot và restore clone sâu dữ liệu", () => {
  const data = new KbDataManager();
  const original = {
    nested: { value: 1 },
    items: [1, 2]
  };

  data.set("test", "object", original);
  const snapshot = data.snapshot();

  original.nested.value = 2;
  original.items.push(3);

  assert.deepEqual(snapshot[0].value, {
    nested: { value: 1 },
    items: [1, 2]
  });

  snapshot[0].value.nested.value = 5;
  assert.equal(data.get("test", "object").nested.value, 2);

  data.restore(snapshot);
  snapshot[0].value.nested.value = 9;

  assert.equal(data.get("test", "object").nested.value, 5);
});

test("MemoryManager: đồng bộ bộ đếm sau mọi thao tác", () => {
  const memory = new KbMemoryManager(1000);

  memory.allocate("a", "owner-1", 100, "graphics");
  memory.allocate("b", "owner-1", 200, "graphics");
  memory.allocate("c", "owner-2", 150, "audio");

  assert.equal(memory.getUsage().allocatedBytes, 450);
  assert.equal(memory.getCategoryUsage("graphics"), 300);
  assert.equal(memory.getOwnerUsage("owner-1"), 300);

  assert.equal(memory.release("a"), true);
  assert.equal(memory.getUsage().allocatedBytes, 350);
  assert.equal(memory.getCategoryUsage("graphics"), 200);

  assert.equal(memory.releaseOwner("owner-1"), 1);
  assert.equal(memory.getUsage().allocatedBytes, 150);
  assert.equal(memory.getOwnerUsage("owner-1"), 0);

  memory.clear();

  assert.equal(memory.getUsage().allocatedBytes, 0);
  assert.equal(memory.getUsage().allocationCount, 0);
  assert.equal(memory.getCategoryUsage("audio"), 0);
  assert.equal(memory.getOwnerUsage("owner-2"), 0);
});

test("EventBus: cô lập lỗi listener và giới hạn event lồng nhau", () => {
  const bus = new KbEventBus(3);
  const calls = [];

  bus.on("failure", () => {
    calls.push("first");
    throw new Error("listener error");
  });

  bus.on("failure", () => calls.push("second"));

  assert.throws(
    () => bus.emit("failure"),
    AggregateError
  );

  assert.deepEqual(calls, ["first", "second"]);

  let depth = 0;

  bus.on("recursive", () => {
    depth++;
    bus.emit("recursive");
  });

  assert.throws(
    () => bus.emit("recursive"),
    AggregateError
  );

  assert.equal(depth, 3);
  assert.equal(bus.listenerCount("recursive"), 1);
});

test("ModuleRegistry: bảo vệ metadata và dependency", async () => {
  const registry = new KbModuleRegistry();

  const originalDependencies = [];
  const baseModule = {
    id: "base",
    version: "1.0.0",
    dependencies: originalDependencies
  };

  registry.register(baseModule);
  originalDependencies.push("missing");

  assert.deepEqual(registry.get("base").dependencies, []);
  assert.throws(
    () => registry.register({
      id: "invalid",
      version: "1.0.0",
      dependencies: ["unknown"]
    }),
    /unknown dependency/
  );

  registry.register({
    id: "child",
    version: "1.0.0",
    dependencies: ["base"]
  });

  await assert.rejects(
    registry.unregister("base"),
    /required by child/
  );

  await registry.unregister("child");
  await registry.unregister("base");

  assert.equal(registry.size, 0);
});

test("ModuleRegistry: giữ module khi dispose lỗi và cho phép retry", async () => {
  const registry = new KbModuleRegistry();
  let attempts = 0;

  registry.register({
    id: "retry",
    version: "1.0.0",
    dispose() {
      attempts++;
      if (attempts === 1) throw new Error("dispose failed");
    }
  });

  await assert.rejects(
    registry.unregister("retry"),
    /dispose failed/
  );

  assert.equal(registry.get("retry") !== undefined, true);
  assert.equal(registry.size, 1);

  await registry.unregister("retry");

  assert.equal(attempts, 2);
  assert.equal(registry.size, 0);
});

test("Lifecycle: rollback module đang chạy khi start thất bại", async () => {
  const core = new KBVerseCore();
  const order = [];
  let shouldFail = true;

  core.register({
    id: "base",
    version: "1.0.0",
    start: () => order.push("start:base"),
    stop: () => order.push("rollback:base")
  });

  core.register({
    id: "child",
    version: "1.0.0",
    dependencies: ["base"],
    start() {
      if (shouldFail) throw new Error("Start failure");
    }
  });

  await core.initialize();

  await assert.rejects(
    core.start(),
    (error) => error.cause?.message === "Start failure"
  );

  assert.deepEqual(order, ["start:base", "rollback:base"]);
  assert.equal(core.isRunning, false);
  assert.equal(core.modules.getState("base"), "initialized");

  shouldFail = false;
  await core.start();

  assert.equal(core.isRunning, true);
  assert.deepEqual(order, ["start:base", "rollback:base", "start:base"]);
  await core.stop();
});

test("Lifecycle: stop nhận signal chưa bị abort", async () => {
  const core = new KBVerseCore();
  let stopSignalAborted;

  core.register({
    id: "signal-test",
    version: "1.0.0",
    stop(context) {
      stopSignalAborted = context.signal.aborted;
    }
  });

  await core.initialize();
  await core.start();
  await core.stop();

  assert.equal(stopSignalAborted, false);
});

test("Lifecycle: từ chối thao tác lifecycle chạy đồng thời", async () => {
  const core = new KBVerseCore();
  let releaseInitialize;

  core.register({
    id: "slow",
    version: "1.0.0",
    initialize: () => new Promise((resolve) => {
      releaseInitialize = resolve;
    })
  });

  const initialization = core.initialize();

  await new Promise((resolve) => setTimeout(resolve, 0));

  await assert.rejects(
    core.initialize(),
    /already in progress/i
  );

  releaseInitialize();
  await initialization;
  await core.stop();
});

test("ResourceManager: ngăn giải phóng cùng tài nguyên đồng thời", async () => {
  const manager = new KbResourceManager();
  let disposeCount = 0;
  let finishDispose;

  manager.register("shared", "test", {}, () => {
    disposeCount++;
    return new Promise((resolve) => {
      finishDispose = resolve;
    });
  });

  const first = manager.release("shared");
  const second = manager.release("shared");

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(disposeCount, 1);

  finishDispose();
  assert.equal(await first, true);
  assert.equal(await second, false);
  assert.equal(manager.size, 0);
});

test("ResourceManager: releaseAll chờ disposer đang chạy hoàn tất", async () => {
  const manager = new KbResourceManager();
  let finishDispose;
  let signalDisposeStarted;
  let releaseAllFinished = false;

  const disposeStarted = new Promise((resolve) => {
    signalDisposeStarted = resolve;
  });

  manager.register("shared", "test", {}, () =>
    new Promise((resolve) => {
      finishDispose = resolve;
      signalDisposeStarted();
    })
  );

  const first = manager.release("shared");
  await disposeStarted;

  const cleanup = manager.releaseAll().then(() => {
    releaseAllFinished = true;
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releaseAllFinished, false);

  finishDispose();
  await Promise.all([first, cleanup]);

  assert.equal(releaseAllFinished, true);
  assert.equal(manager.size, 0);
});

test("ModuleRegistry: chỉ cho phép chuyển trạng thái hợp lệ", () => {
  const registry = new KbModuleRegistry();
  registry.register({ id: "guard", version: "1.0.0" });

  assert.throws(
    () => registry.setState("guard", "running"),
    /Invalid module state transition/
  );
  assert.equal(registry.getState("guard"), "registered");

  registry.setState("guard", "initializing");
  registry.setState("guard", "initialized");
  registry.setState("guard", "starting");
  registry.setState("guard", "running");

  assert.throws(
    () => registry.setState("guard", "registered"),
    /Invalid module state transition/
  );

  registry.setState("guard", "stopping");
  registry.setState("guard", "stopped");
  registry.setState("guard", "initializing");
  registry.setState("guard", "initialized");
  registry.setState("guard", "starting");
  registry.setState("guard", "failed");
  registry.setState("guard", "initialized");

  assert.equal(registry.getState("guard"), "initialized");
});

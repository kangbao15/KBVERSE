kb.log("Hello from my KBVERSE mod!");

kb.registerCommand(
  { id: "hello", title: "Say Hello" },
  () => {
    kb.notify("Hello from my first KBVERSE mod!");
  }
);

async function createDemoObject() {
  const objectId = await kb.scene.addPrimitive({
    type: "box",
    name: "My First Mod Object",
    color: "#7c6cff",
    position: [0, 1, 0],
    size: [1, 1, 1]
  });

  await kb.storage.set("lastObject", objectId);
}

createDemoObject().catch(error => kb.log(error));
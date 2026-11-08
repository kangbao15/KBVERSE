import Fastify from "fastify";

const app = Fastify({
  logger: true
});

app.get("/api/health", async () => ({
  name: "KBVERSE",
  status: "online",
  version: "0.1.0"
}));

const start = async (): Promise<void> => {
  try {
    await app.listen({
      host: "127.0.0.1",
      port: 3001
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();

// Import required modules
import { log } from "console";
import { Elysia } from "elysia";
import { Worker } from "worker_threads";

const PORT = Number(process.env.PORT) || 3000;

const app = new Elysia();

// Define the graph data type and data (adjacency list)
type Graph = { [key: number]: number[] };
const graph: Graph = {
  1: [2, 3],
  2: [1,4],
  3: [1,5, 6],
  4: [2],
  5: [3],
  6: [3],
};

// Function to perform BFS
function bfs(startNode: number): number[] {
  const visited = new Set<number>();
  const queue: number[] = [startNode];
  visited.add(startNode);

  const result: number[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!; // Non-null assertion
    result.push(node);

    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return result;
}

const nodeNo = (port: number): number | undefined => {
  const node: { [key: string]: number } = {
    3001: 1,
    3002: 2,
    3003: 3,
    3004: 4,
    3005: 5,
    3006: 6,
  };
  return node[port.toString()];
};

// API endpoint for BFS
app.get("/", async ({ query }) => {
  console.log(nodeNo(PORT)); // Example usage of nodeNo to avoid 'declared but its value is never read' error
  const startNode = parseInt((nodeNo(PORT)?.toString() || "1"));

  if (!graph[startNode]) {
    return { status: 400, body: { error: "Invalid start node" } };
  }

  return new Promise((resolve, reject) => {
    // Using Worker Threads for parallelism (simulate parallel BFS)
    const worker = new Worker(
      `
            const { parentPort } = require('worker_threads');

            const graph = ${JSON.stringify(graph)};

            function bfs(startNode) {
                const visited = new Set();
                const queue = [startNode];
                visited.add(startNode);

                const result = [];
                while (queue.length > 0) {
                    const node = queue.shift();
                    result.push(node);

                    for (const neighbor of graph[node]) {
                        if (!visited.has(neighbor)) {
                            visited.add(neighbor);
                            queue.push(neighbor);
                        }
                    }
                }

                return result;
            }

            parentPort.on('message', (startNode) => {
                const result = bfs(startNode);
                parentPort.postMessage(result);
            });
        `,
      { eval: true }
    );

    worker.on("message", (result: number[]) => {
      resolve({ status: 200, body: { startNode, traversal: result } });
      console.log({
        status: 200,
        body: { startNode, traversal: result },
      });
      
    });


    worker.on("error", (err: Error) => {
      reject({
        status: 500,
        body: { error: "Worker error", details: err.message },
      });
    });

    worker.postMessage(startNode);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(
    `Server is running on http://localhost:${PORT}`
  );
});

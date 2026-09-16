import { defineConfig } from "orval";

export default defineConfig({
  haythive: {
    input: "./openapi/openapi.json",
    output: {
      mode: "tags-split",
      target: "./src/api/generated/endpoints",
      schemas: "./src/api/generated/models",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "./src/api/mutator.ts",
          name: "customFetch",
        },
      },
    },
  },
});

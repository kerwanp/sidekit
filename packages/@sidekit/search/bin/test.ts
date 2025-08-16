import { expect } from "@japa/expect";
import { assert } from "@japa/assert";
import { expectTypeOf } from "@japa/expect-type";
import { processCLIArgs, configure, run } from "@japa/runner";
import { fileSystem } from "@japa/file-system";
import { BASE_URL } from "../tests/helpers.js";

processCLIArgs(process.argv.slice(2));
configure({
  files: ["tests/**/*.spec.ts"],
  plugins: [
    assert(),
    expect(),
    expectTypeOf(),
    fileSystem({ basePath: BASE_URL }),
  ],
});

/*
|--------------------------------------------------------------------------
| Run tests
|--------------------------------------------------------------------------
|
| The following "run" method is required to execute all the tests.
|
*/
run();

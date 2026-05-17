import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("alice's thought syncs to bob and upvote tally syncs back", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(500);

    await a.getByPlaceholder("a shower thought…").fill("hot dogs eat themselves");
    await a.getByRole("button", { name: "drop it", exact: true }).click();

    await expect(b.locator(".shower-thought")).toContainText("hot dogs eat themselves");
    await expect(b.locator(".shower-thought")).toContainText("alice");

    const id = await b.locator(".shower-thought").first().getAttribute("data-thought-id");
    if (!id) throw new Error("no data-thought-id");
    await b.locator(`button.shower-up[data-thought-id="${id}"]`).click();
    await expect(a.locator(`.shower-thought[data-thought-id="${id}"] .shower-score`)).toContainText(
      "1",
    );
  } finally {
    await cleanup();
  }
});

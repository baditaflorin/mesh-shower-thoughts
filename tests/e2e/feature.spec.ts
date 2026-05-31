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

test("a peer's upvote re-sorts the feed by score on both screens", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(500);

    // Alice posts two thoughts; "second" arrives after "first" so without any
    // votes the score is tied and "first" (older ts) wins the tiebreak.
    await a.getByPlaceholder("a shower thought…").fill("first thought");
    await a.getByRole("button", { name: "drop it", exact: true }).click();
    await a.getByPlaceholder("a shower thought…").fill("second thought");
    await a.getByRole("button", { name: "drop it", exact: true }).click();

    // Both peers must see both thoughts, "first" on top.
    await expect(b.locator(".shower-thought")).toHaveCount(2);
    await expect(a.locator(".shower-thought").first()).toContainText("first thought");
    await expect(b.locator(".shower-thought").first()).toContainText("first thought");

    // Bob upvotes "second thought" → its score becomes the highest, so it must
    // jump to the top of the feed on BOTH peers' screens (cross-peer re-sort).
    const secondId = await b
      .locator(".shower-thought", { hasText: "second thought" })
      .getAttribute("data-thought-id");
    if (!secondId) throw new Error("no data-thought-id for second thought");
    await b.locator(`button.shower-up[data-thought-id="${secondId}"]`).click();

    await expect(b.locator(".shower-thought").first()).toContainText("second thought");
    await expect(a.locator(".shower-thought").first()).toContainText("second thought");
  } finally {
    await cleanup();
  }
});

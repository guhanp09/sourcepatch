import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your sources moved on." }),
  ).toBeVisible();
});

test("review a changed quantity, persist it, export it, and reopen after another source revision", async ({
  page,
}) => {
  await page
    .getByLabel("Reviewed wording")
    .fill(
      "Plan for 80 participants: 40 in the treatment group and 40 in the control group.",
    );
  await page
    .getByLabel("Review note")
    .fill("The sample increased; updated the total and both group sizes.");
  await page.getByRole("checkbox", { name: "I checked the wording" }).check();
  await page.getByRole("button", { name: "Save reviewed passage" }).click();
  await expect(page.getByRole("status")).toContainText("Review saved");
  await page.reload();
  await page.getByLabel("Filter review queue").selectOption("all");
  await page
    .getByRole("button", { name: /Experiment revision guide 01 Plan for 80/ })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Passage review" })
      .getByText("No source change", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Outputs 3", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Experiment revision guide" }),
    })
    .getByRole("button", { name: "Export note" })
    .click();
  const download = await downloadPromise;
  const body = await readFile((await download.path())!, "utf8");
  expect(body).toContain("Plan for 80 participants");
  expect(body).toContain("2 of 3 passages still need review");
  await page.getByRole("button", { name: "Sources 3", exact: true }).click();
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Experiment handbook" }) })
    .getByRole("button", { name: "Add revision" })
    .click();
  const old = await page
    .getByLabel("Source text", { exact: true })
    .inputValue();
  await page
    .getByLabel("Source text", { exact: true })
    .fill(old.replace("80 participants", "100 participants"));
  await page.getByRole("button", { name: "Save revision" }).click();
  await page.getByRole("button", { name: /^Review queue/ }).click();
  await page
    .getByRole("button", { name: /Experiment revision guide 01 Plan for 80/ })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Passage review" })
      .getByText("Evidence changed", { exact: true }),
  ).toBeVisible();
});

test("create and use a custom workspace from original source through revised note", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "New workspace", exact: true })
    .click();
  await page.getByLabel("New workspace name").fill("My field notes");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page
    .getByRole("button", { name: "Add source", exact: true })
    .first()
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Survey protocol");
  await page
    .getByLabel("Source text", { exact: true })
    .fill("The survey includes 20 participants.");
  await page.getByRole("button", { name: "Save source" }).click();
  await page.getByRole("button", { name: "Outputs 0", exact: true }).click();
  await page
    .getByRole("button", { name: "Import output", exact: true })
    .first()
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Survey summary");
  await page
    .getByLabel("Output text", { exact: true })
    .fill("The survey includes 20 participants.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import output", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Passage review" })
      .getByText("Link evidence", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Review note")
    .fill("Confirmed against the original protocol.");
  await page.getByRole("checkbox", { name: "I checked the wording" }).check();
  await page.getByRole("button", { name: "Save reviewed passage" }).click();
  await page.getByRole("button", { name: "Sources 1", exact: true }).click();
  await page.getByRole("button", { name: "Add revision" }).click();
  await page
    .getByLabel("Source text", { exact: true })
    .fill("The survey includes 25 participants.");
  await page.getByRole("button", { name: "Save revision" }).click();
  await page.getByRole("button", { name: /^Review queue/ }).click();
  await expect(
    page
      .getByRole("region", { name: "Passage review" })
      .getByText("Evidence changed", { exact: true }),
  ).toBeVisible();
});

test("shows changed context even when the linked excerpt survives", async ({
  page,
}) => {
  await page
    .getByRole("button", {
      name: /Experiment revision guide 03 Random assignment/,
    })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Passage review" })
      .getByText("Context changed", { exact: true }),
  ).toBeVisible();
  await page.getByText("See changes elsewhere in this source").click();
  await expect(page.locator(".context-diff")).toContainText(
    "does not support generalizing",
  );
});

test("archive and restore a source without losing its revisions", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Sources 3", exact: true }).click();
  const source = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Experiment handbook" }),
    });
  await source.getByRole("button", { name: "Archive source" }).click();
  await expect(
    source.getByRole("button", { name: "Add revision" }),
  ).toBeDisabled();
  await source.getByRole("button", { name: "Restore source" }).click();
  await expect(source).toContainText("2 snapshots");
  await expect(
    source.getByRole("button", { name: "Add revision" }),
  ).toBeEnabled();
});

test("rejects a malformed backup without replacing the workspace", async ({
  page,
}) => {
  await page
    .getByLabel("Restore workspace file")
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"not":"a workspace"}'),
    });
  await expect(page.getByRole("status")).toContainText("Import failed");
  await expect(
    page.getByRole("button", { name: "Sources 3", exact: true }),
  ).toBeVisible();
});

test("exported backups restore with identical data and verified provenance", async ({
  page,
}) => {
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export workspace", exact: true })
    .click();
  const download = await downloadPromise;
  const buffer = await readFile((await download.path())!);
  await page
    .getByLabel("Restore workspace file")
    .setInputFiles({
      name: download.suggestedFilename(),
      mimeType: "application/json",
      buffer,
    });
  await page
    .getByRole("button", { name: "Restore workspace", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "fingerprints and evidence references were verified",
  );
});

test("keyboard users can open, traverse and dismiss a modal", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Import output", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("user text is rendered as text, never executable markup", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Import output", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Markup test");
  await page
    .getByLabel("Output text", { exact: true })
    .fill('<img src=x onerror="window.__executed=true">');
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import output", exact: true })
    .click();
  await expect(page.locator(".original-passage")).toContainText("<img");
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__executed,
    ),
  ).toBeUndefined();
  expect(await page.locator(".original-passage img").count()).toBe(0);
});

test("browser workflow makes no third-party requests", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:4173/") &&
      !request.url().startsWith("data:")
    )
      external.push(request.url());
  });
  await page.reload();
  await page.getByRole("button", { name: "Sources 3", exact: true }).click();
  await page.getByRole("button", { name: "Outputs 3", exact: true }).click();
  expect(external).toEqual([]);
});

test("conflicting edits from another tab cannot silently overwrite saved work", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "Sources 3", exact: true }).click();
  await other
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Archive source" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Another tab changed");
  await page.getByLabel("Reviewed wording").fill("Changed in the older tab.");
  await page.getByRole("checkbox", { name: "I checked the wording" }).check();
  await page.getByRole("button", { name: "Save reviewed passage" }).click();
  await expect(page.locator(".form-error")).toContainText(
    "Reload before saving",
  );
});

test("storage failure is visible and an in-memory backup can still be exported", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("in memory only");
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export workspace", exact: true })
    .click();
  expect((await promise).suggestedFilename()).toContain(".sourcepatch.json");
});

test("corrupt saved data is preserved until the user chooses recovery", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem("sourcepatch.workspace.v1", "{corrupt"),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "stored file has been preserved",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("sourcepatch.workspace.v1")),
  ).toBe("{corrupt");
});

for (const route of [
  "review",
  "sources",
  "outputs",
  "activity",
  "brief",
  "dialog",
]) {
  test(`WCAG automated checks: ${route}`, async ({ page }) => {
    if (route === "sources")
      await page
        .getByRole("button", { name: "Sources 3", exact: true })
        .click();
    if (route === "outputs")
      await page
        .getByRole("button", { name: "Outputs 3", exact: true })
        .click();
    if (route === "activity")
      await page
        .getByRole("button", { name: "Review history", exact: true })
        .click();
    if (route === "brief")
      await page
        .getByRole("button", { name: "Why this exists", exact: true })
        .click();
    if (route === "dialog")
      await page
        .getByRole("button", { name: "Import output", exact: true })
        .click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target.join(" ")),
      })),
    ).toEqual([]);
  });
}

test("mobile review remains usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: /Workshop preparation note 01 Attend/ })
    .click();
  await expect(
    page.getByRole("region", { name: "Passage review" }),
  ).toContainText("21 November");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target.join(" ")),
    })),
  ).toEqual([]);
});

// Browser QA via Playwright browser_run_code_unsafe. External pages are
// intercepted locally; this checks navigation without launching a mail app.
async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const context = page.context();
  const stub = route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Contact destination</title>' });
  const externalRoutes = ['https://t.me/**', 'https://www.behance.net/**'];
  for (const route of externalRoutes) await context.route(route, stub);
  const expected = ['https://t.me/marrorball', 'mailto:marrorball@gmail.com', 'https://www.behance.net/marmaraj11'];
  const results = [];
  try {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('http://localhost:5173/missing-mar-portfolio/#contact');
      // Re-running QA on the same hash can keep the document and listeners.
      await page.reload();
      const flyerSelector = width === 390 ? '.screen-flat .flyer-tabs a' : '.kiosk-screens .flyer-tabs a';
      await page.locator(flyerSelector).first().waitFor({ state: 'visible' });
      await page.evaluate(() => {
        window.__contactQA = [];
        document.addEventListener('click', event => {
          const link = event.target.closest('a[href^="mailto:"]');
          if (link) {
            window.__contactQA.push(link.href);
            event.preventDefault();
          }
        }, true);
      });
      for (const surface of ['flyer', 'footer']) {
        if (surface === 'footer') {
          // On phones the flyer is a full-screen page over the help bar.
          await page.keyboard.press('Escape');
          await page.locator('.screen-flat').waitFor({ state: 'detached' });
          await page.getByRole('navigation', { name: 'Помощь по ларьку' })
            .getByRole('button', { name: 'Контакты', exact: true }).click();
        }
        const links = page.locator(surface === 'flyer' ? flyerSelector : '#contact-card a');
        const hrefs = await links.evaluateAll(items => items.map(link => link.href));
        if (JSON.stringify(hrefs) !== JSON.stringify(expected)) throw new Error(`${surface}: incorrect links`);
        for (let index = 0; index < expected.length; index += 1) {
          const link = links.nth(index);
          if (expected[index].startsWith('mailto:')) {
            await link.click();
          } else {
            const pending = page.waitForEvent('popup');
            await link.click();
            const popup = await pending;
            await popup.waitForURL(expected[index]);
            await popup.close();
          }
        }
        results.push({ width, surface, hrefs });
      }
      const emails = await page.evaluate(() => window.__contactQA);
      if (emails.length !== 2 || emails.some(email => email !== expected[1])) throw new Error('email click');
      if (await page.locator('[data-action="copy-contact"]').count()) throw new Error('copy button remains');
      if (await page.getByRole('navigation', { name: 'Помощь по ларьку' })
        .getByRole('button', { name: 'Контакты', exact: true }).getAttribute('aria-expanded') !== 'true') throw new Error('footer state');
      await page.keyboard.press('Escape');
      await page.locator('#contact-card').waitFor({ state: 'detached' });
    }
  } finally {
    for (const route of externalRoutes) await context.unroute(route, stub);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { results, errors };
}

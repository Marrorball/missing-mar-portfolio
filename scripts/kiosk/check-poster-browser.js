// Targeted browser QA; run via Playwright browser_run_code_unsafe.
async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = [];
  for (const width of [1009, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 977 });
    await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
    for (const hash of ['about', 'pricelist']) {
      await page.goto(`http://localhost:5173/missing-mar-portfolio/#${hash}`);
      await page.waitForFunction(() => window.__kiosk?.current === 'billboard' && !window.__kiosk.inFlight);
      const board = page.locator('.kiosk-screens .screen-billboard');
      await board.waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.querySelector('.kiosk-screens .screen-billboard')
        .style.getPropertyValue('--billboard-wear').startsWith('url('));
      const surface = await board.evaluate(element => ({
        isolation: getComputedStyle(element).isolation,
        flash: getComputedStyle(element).animationName,
        pointerEvents: ['::before', '::after'].map(pseudo => getComputedStyle(element, pseudo).pointerEvents)
      }));
      if (surface.isolation !== 'isolate' || surface.flash !== 'none'
        || surface.pointerEvents.some(value => value !== 'none')) throw new Error('decorative layers');
      await board.locator('.screen-scroll').evaluate(element => { element.scrollTop = 130; });
      if (!await board.locator('.screen-scroll').evaluate(element => element.scrollTop > 0)) throw new Error('scrolling');
      // Keyboard activation also verifies that the decorative layers do not
      // interfere with the existing accessible tabs.
      const next = hash === 'about' ? 'Прайс' : 'Обо мне';
      await board.getByRole('link', { name: next, exact: true }).press('Enter');
      await page.waitForURL(hash === 'about' ? '**/#pricelist' : '**/#about');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => {
        window.__kiosk.frame();
        return window.__kiosk.current === 'home' && !window.__kiosk.inFlight;
      }, null, { polling: 50 });
      const street = await page.evaluate(() => {
        const kiosk = window.__kiosk;
        const expected = kiosk.scene.getObjectByName('cam_home').getWorldPosition(kiosk.camera.position.clone());
        return { position: kiosk.camera.position.toArray(), distance: kiosk.camera.position.distanceTo(expected) };
      });
      // These two tested aspect ratios keep the original overview distance.
      // A direct URL used to return to (0,0,0), despite reporting "home".
      if (street.distance > .03) throw new Error(`incorrect street view: ${JSON.stringify(street)}`);
      results.push({ width, hash, surface, street });
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { results, errors };
}

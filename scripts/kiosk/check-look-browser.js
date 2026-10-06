// Playwright MCP: run this file to verify real keyboard/mouse/multi-touch input.
async (page) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/missing-mar-portfolio/');
  await page.locator('.kiosk-loading').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Внутрь', exact: true }).click();
  await page.waitForFunction(() => window.__kiosk && !window.__kiosk.inFlight);
  const eye = await page.evaluate(() => window.__kiosk.camera.position.toArray());
  const before = await page.evaluate(() => {
    const k = window.__kiosk;
    const direction = k.controls.target.clone().sub(k.camera.position).normalize();
    return { direction: direction.toArray(), right: direction.clone().cross(k.camera.up).normalize().toArray() };
  });
  await page.keyboard.press('ArrowRight');
  const direction = () => page.evaluate(() => window.__kiosk.controls.target.clone().sub(window.__kiosk.camera.position).normalize().toArray());
  const after = await direction();
  const arrowRightProjection = after.reduce((sum, value, i) => sum + (value - before.direction[i]) * before.right[i], 0);
  if (arrowRightProjection <= 0) throw new Error('ArrowRight turns left');
  const cdp = await page.context().newCDPSession(page);
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  const movements = [];
  for (let run = 0; run < 2; run += 1) {
    const id = run * 2;
    await send('touchStart', [{ x: 500, y: 400, id }]);
    await send('touchStart', [{ x: 500, y: 400, id }, { x: 700, y: 400, id: id + 1 }]);
    await send('touchMove', [{ x: 500, y: 400, id }, { x: 850, y: 400, id: id + 1 }]);
    // CDP specifies the finger being released, rather than the remaining one.
    await send('touchEnd', [{ x: 850, y: 400, id: id + 1 }]);
    const start = await direction();
    await send('touchMove', [{ x: 650, y: 400, id }]);
    await page.waitForFunction(start => {
      const k = window.__kiosk;
      const next = k.controls.target.clone().sub(k.camera.position).normalize().toArray();
      return Math.hypot(...next.map((value, i) => value - start[i])) > 0.2;
    }, start, { timeout: 10000 });
    const finish = await direction();
    const movement = Math.hypot(...finish.map((value, i) => value - start[i]));
    if (movement < 0.2) throw new Error('Remaining finger stops rotating after pinch');
    movements.push(movement);
    await send('touchEnd', []);
  }
  await cdp.detach();
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, 10000);
  await page.waitForFunction(() => window.__kiosk.camera.fov === 84);
  const wide = await page.evaluate(() => window.__kiosk.camera.fov);
  await page.mouse.wheel(0, -10000);
  await page.waitForFunction(() => window.__kiosk.camera.fov === 52);
  const close = await page.evaluate(() => window.__kiosk.camera.fov);
  const finalEye = await page.evaluate(() => window.__kiosk.camera.position.toArray());
  if (wide !== 84 || close !== 52 || eye.some((value, i) => Math.abs(value - finalEye[i]) > 1e-8)) throw new Error('Zoom moves the camera through the room');
  await page.getByRole('button', { name: 'К ларьку', exact: true }).click();
  await page.waitForFunction(() => !window.__kiosk.inFlight);
  if (!await page.evaluate(() => window.__kiosk.controls.enabled)) throw new Error('Outside orbit remains disabled');
  return { arrowRightProjection, movements, zoom: [close, wide], eyeStayedFixed: true, outsideOrbitRestored: true };
}

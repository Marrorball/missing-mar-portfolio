// Targeted browser QA; run through Playwright browser_run_code_unsafe.
async page => {
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  const ready = () => page.waitForFunction(() => window.__kiosk);
  const landed = preset => page.waitForFunction(preset => {
    window.__kiosk.frame();
    return window.__kiosk.current === preset && !window.__kiosk.inFlight;
  },preset,{polling:50});
  await page.setViewportSize({width:1100,height:900});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://localhost:5173/missing-mar-portfolio/');
  await ready();
  await page.locator('.kiosk-loading').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Проекты',exact:true}).click();
  await landed('rack');
  await page.getByRole('button',{name:'Внутрь',exact:true}).click();
  await landed('inside');
  await page.getByRole('button',{name:'Выйти',exact:true}).click();
  await landed('rack');
  await page.getByRole('link',{name:'Обо мне',exact:true}).first().click();
  await landed('billboard');
  await page.locator('.screen-billboard.is-on').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await landed('rack');
  await page.getByRole('button',{name:'Проекты',exact:true}).click();
  await landed('rack');
  // First KORTEX is the showcase hit; second is the actual disc on the rack.
  await page.getByRole('button',{name:'KORTEX',exact:true}).nth(1).press('Enter');
  await page.waitForFunction(() => !!window.__kiosk.scene.getObjectByName('playing_disc'),{},{polling:20});
  await landed('tv');
  await page.waitForFunction(() => {
    window.__kiosk.frame();
    return !window.__kiosk.scene.getObjectByName('playing_disc');
  },{},{polling:50});
  if(errors.length) throw new Error(errors.join('\n'));
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://localhost:5173/missing-mar-portfolio/');
  await ready();
  await page.getByRole('button',{name:'Внутрь',exact:true}).click();
  await landed('inside');
  if(await page.evaluate(() => window.__kiosk.inFlight)) throw new Error('reduced-motion flight');
  return {checks:['rack to inside','inside returns to previous street view','about billboard','DVD rides to TV and disappears','mobile reduced motion'],errors};
}

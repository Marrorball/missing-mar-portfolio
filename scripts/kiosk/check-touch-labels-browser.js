async page => {
  const browser = page.context().browser();
  const results = [];
  const errors = [];
  const output = '/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/kiosk-touch-labels';
  const wait = async p => {
    await p.waitForFunction(() => { window.__kiosk?.frame(); return window.__kiosk && !window.__kiosk.inFlight; }, { timeout: 60000 });
    if(await p.evaluate(()=>matchMedia('(hover: none), (any-pointer: coarse)').matches)
      && !(await p.locator('.kiosk-touch-labels').getAttribute('hidden'))
      && await p.locator('.kiosk-touch-labels').isVisible()) {
      await p.waitForFunction(()=>!document.querySelector('.kiosk-touch-labels').classList.contains('is-moving'));
    }
    await p.waitForTimeout(200);
  };
  for (const device of [
    {name:'phone',width:390,height:844,touch:true},
    {name:'ipad-portrait',width:820,height:1180,touch:true},
    {name:'ipad-landscape',width:1180,height:820,touch:true},
    {name:'desktop',width:1280,height:720,touch:false}
  ]) {
    const context = await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.touch,hasTouch:device.touch,deviceScaleFactor:1,reducedMotion:'reduce'});
    const p = await context.newPage();
    p.on('pageerror', e => errors.push(`${device.name}: ${e.message}`));
    try {
      await p.goto('http://localhost:5173/missing-mar-portfolio/');
      await wait(p);
      const labels = p.locator('.kiosk-touch-label:visible');
      const names = await labels.allTextContents();
      if (!device.touch) {
        if (names.length) throw new Error('Touch labels appeared on desktop');
        const point = await p.evaluate(() => {
          const k=window.__kiosk; const o=k.scene.getObjectByName('hs_rack'); const v=o.position.clone();o.getWorldPosition(v);v.project(k.camera);
          return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};
        });
        await p.mouse.move(point.x,point.y);
        await p.evaluate(()=>window.__kiosk.frame());
        await p.locator('#kiosk-label').waitFor({state:'visible'});
        results.push({device:device.name,labels:names,hover:await p.locator('#kiosk-label').innerText()});
        continue;
      }
      if (!names.length || names.length > (device.width <= 600 ? 2 : 3)) throw new Error('Too many labels');
      if (!names.includes('Все проекты')) throw new Error('Missing main project action');
      const rects = await labels.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {node:e.dataset.node,x:r.x,y:r.y,w:r.width,h:r.height};}));
      for(const [i,a] of rects.entries()) {
        if(a.h<44 || a.x<0 || a.x+a.w>device.width) throw new Error('Invalid touch target');
        for(const b of rects.slice(i+1)) if(a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y) throw new Error('Labels overlap');
      }
      await p.screenshot({path:`${output}/${device.name}.png`});
      await p.getByRole('navigation',{name:'Помощь по ларьку'}).getByRole('button',{name:'Контакты',exact:true}).tap();
      await wait(p);
      if(await p.locator('.kiosk-touch-labels').isVisible()) throw new Error('Labels remain over a contact card');
      await p.keyboard.press('Escape');await wait(p);
      await p.locator('.kiosk-touch-label[data-node="hs_rack"]').tap();await wait(p);
      await p.waitForFunction(()=>window.__kiosk.current==='rack');
      const projects=await labels.allTextContents();
      if(!projects.length) throw new Error('No project titles on rack');
      await p.screenshot({path:`${output}/${device.name}-rack.png`});
      await p.locator('.kiosk-touch-label[data-node^="disc_"]:visible').first().tap();await wait(p);
      await p.waitForFunction(()=>location.hash.startsWith('#project/'));
      if(await p.locator('.kiosk-touch-labels').isVisible()) throw new Error('Labels remain over a project page');
      await p.goto('http://localhost:5173/missing-mar-portfolio/');await wait(p);
      await p.getByRole('navigation',{name:'Помощь по ларьку'}).getByRole('button',{name:'Внутрь',exact:true}).tap();await wait(p);
      await p.waitForFunction(()=>window.__kiosk.current==='inside');
      const inside=await labels.allTextContents();
      if(!inside.length) throw new Error('No labels inside');
      await p.screenshot({path:`${output}/${device.name}-inside.png`});
      // Labels stay fixed and fade away for an actual camera gesture.
      await p.mouse.move(device.width*0.5, device.height*0.45);
      await p.mouse.down();
      await p.mouse.move(device.width*0.7, device.height*0.45,{steps:12});
      await p.evaluate(()=>window.__kiosk.frame());
      if(!await p.locator('.kiosk-touch-labels').evaluate(e=>e.classList.contains('is-moving'))) throw new Error('Labels chase a moving camera');
      await p.mouse.up();await wait(p);
      if(await labels.count() > (device.width <= 600 ? 2 : 3)) throw new Error('Too many labels after gesture');
      results.push({device:device.name,labels:names,rack:projects,inside,contactTap:true,projectTap:true,gestureFade:true});
    } finally { await context.close(); }
  }
  if(errors.length) throw new Error(errors.join('\n'));
  return {results,errors};
}

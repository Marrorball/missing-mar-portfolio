async page => {
  const browser = page.context().browser();
  const base = 'http://localhost:5173/missing-mar-portfolio/';
  const output = '/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/kiosk-explore';
  const results = [];
  const errors = [];
  const wait = async p => p.waitForFunction(() => {window.__kiosk?.frame();return window.__kiosk && !window.__kiosk.inFlight;}, null, {timeout:60000});
  for (const size of [{name:'phone',width:390,height:844},{name:'ipad-portrait',width:820,height:1180},{name:'ipad-landscape',width:1180,height:820}]) {
    const c = await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
    const p = await c.newPage();
    p.on('pageerror',e=>errors.push(e.message));
    const open = async () => {
      await p.getByRole('button',{name:'Осмотреть',exact:true}).tap();
      await p.getByRole('dialog',{name:'Осмотреть ларёк'}).waitFor({state:'visible'});
    };
    const reset = async () => {await p.goto(base);await p.reload();await wait(p);};
    try {
      await reset();
      await p.waitForFunction(()=>!document.querySelector('.kiosk-touch-labels').classList.contains('is-moving'));
      await p.locator('.kiosk-touch-label[data-node="hs_flyer"]').tap();await wait(p);
      if(await p.evaluate(()=>location.hash)!=='#contact')throw Error('Direct contact label failed');
      await p.locator('.screen-flyer .flyer-tabs a').filter({visible:true}).first().waitFor({state:'visible'});
      await p.screenshot({path:`${output}/${size.name}-contacts.png`});
      await reset();await open();
      const projectLinks=await p.locator('#kiosk-explore a[href^="#project/"]').evaluateAll(es=>es.map(e=>({href:e.getAttribute('href'),text:e.textContent})));
      if(projectLinks.length!==7)throw Error('Missing projects');
      await p.screenshot({path:`${output}/${size.name}-menu.png`});
      await p.getByRole('button',{name:'Закрыть список объектов'}).tap();
      if(await p.evaluate(()=>document.activeElement?.dataset.action)!=='kiosk-explore')throw Error('Focus did not return');
      const checks = [
        ['hs_flyer','flyer','#contact'],['hs_pricelist','price','#price'],['hs_billboard','billboard','#about'],
        ['hs_terminal','terminal',null],['hs_rack','rack',null],['hs_showcase','showcase',null],
        ['hs_backdoor','inside',null],['hs_tv','tv','#catalog'],['hs_cat','cat',null],
        ['hs_radio','inside',null],['hs_calendar','inside',null],['hs_sign_away','home',null]
      ];
      const checked=[];
      for(const [node,preset,hash] of checks) {
        await reset();await open();
        await p.locator(`#kiosk-explore [data-node="${node}"]`).tap();
        await p.waitForFunction(preset=>{window.__kiosk.frame();return window.__kiosk.current===preset&&!window.__kiosk.inFlight;},preset);
        const state=await p.evaluate(()=>({current:window.__kiosk.current,hash:location.hash,dialog:document.querySelector('#kiosk-explore')?.open}));
        if(state.current!==preset || (hash && state.hash!==hash) || state.dialog)throw Error(`${node}: ${JSON.stringify(state)}`);
        if(['hs_radio','hs_calendar'].includes(node)) {
          const dot=await p.evaluate(node=>{const k=window.__kiosk,o=k.scene.getObjectByName(node==='hs_calendar'?'calendar_print':node),v=o.position.clone();o.geometry.computeBoundingBox();o.geometry.boundingBox.getCenter(v);o.localToWorld(v);return k.camera.getWorldDirection(v.clone()).dot(v.sub(k.camera.position).normalize());},node);
          if(dot<0.98)throw Error(`Camera did not face ${node}: ${dot}`);
        }
        checked.push(node);
      }
      for(const link of (size.name==='phone'?projectLinks:projectLinks.slice(0,1))) {
        await reset();await open();
        await p.locator(`#kiosk-explore a[href="${link.href}"]`).tap();
        await p.waitForFunction(()=>{window.__kiosk.frame();return window.__kiosk.current==='tv'&&!window.__kiosk.inFlight;});
        if(await p.evaluate(()=>location.hash)!==link.href)throw Error(`Project failed ${link.text}`);
        if(await p.evaluate(()=>window.__kiosk.current)!=='tv')throw Error('Project TV did not open');
      }
      await reset();await p.getByRole('navigation',{name:'Помощь по ларьку'}).getByRole('button',{name:'Внутрь',exact:true}).tap();await wait(p);await open();
      await p.keyboard.press('Escape');
      if(await p.evaluate(()=>window.__kiosk.current)!=='inside')throw Error('Escape also navigated away');
      await open();await p.getByRole('button',{name:'Выйти на улицу',exact:true}).tap();await wait(p);
      if(await p.evaluate(()=>window.__kiosk.current)!=='home')throw Error('Menu exit failed');
      results.push({device:size.name,directFlyer:true,objects:checked,projects:size.name==='phone'?projectLinks.length:1,focusReturn:true,escape:true,exit:true});
    } finally {await c.close();}
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {results,errors};
}

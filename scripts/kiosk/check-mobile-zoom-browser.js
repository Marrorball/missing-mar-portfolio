async page => {
  const results=[],errors=[],browser=page.context().browser();
  const base='http://localhost:5173/missing-mar-portfolio/';
  const output='/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/kiosk-mobile-zoom';
  for(const size of [{name:'phone',width:390,height:844},{name:'small-phone',width:320,height:568},{name:'ipad',width:820,height:1180},{name:'phone-landscape',width:844,height:390}]) {
    const c=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'});
    const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
    const ready=async preset=>p.waitForFunction(preset=>{window.__kiosk?.frame();return window.__kiosk?.current===preset&&!window.__kiosk.inFlight;},preset,{timeout:60000});
    const home=async()=>{await p.goto(base);await p.reload();await ready('home');};
    const point=async node=>p.evaluate(node=>{
      const k=window.__kiosk,o=k.scene.getObjectByName(node),pts=[];
      k.scene.updateMatrixWorld(true);k.camera.updateMatrixWorld();
      o.traverse(m=>{if(!m.geometry)return;m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;
        for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
          const v=k.camera.position.clone().set(x,y,z).applyMatrix4(m.matrixWorld).project(k.camera);
          pts.push({x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2});
        }});
      const xmin=Math.max(2,Math.min(...pts.map(p=>p.x))),xmax=Math.min(innerWidth-2,Math.max(...pts.map(p=>p.x)));
      const ymin=Math.max(2,Math.min(...pts.map(p=>p.y))),ymax=Math.min(document.querySelector('.kiosk-help').getBoundingClientRect().top-2,Math.max(...pts.map(p=>p.y)));
      for(const n of [3,9,17])for(let row=0;row<n;row++)for(let col=0;col<n;col++) {
        const x=xmin+(xmax-xmin)*(col+.5)/n,y=ymin+(ymax-ymin)*(row+.5)/n;
        if(k.pick(x,y)===node)return {x,y};
      }
      return null;
    },node);
    try {
      await home();
      if(await p.locator('.kiosk-touch-label,#kiosk-explore,.kiosk-hint').count())throw Error('Touch hints remain');
      if(await p.getByRole('button',{name:'Осмотреть',exact:true}).count())throw Error('Explore remains');
      const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      if(overflow)throw Error('Horizontal overflow');
      await p.screenshot({path:`${output}/${size.name}.png`});
      const taps=[];
      for(const [node,preset,hash] of [['hs_flyer','flyer','#contact'],['hs_terminal','terminal',null],['hs_billboard','billboard','#about'],['hs_rack','rack',null],['hs_showcase','showcase',null]]) {
        await home();const hit=await point(node);if(!hit)throw Error(`Not reachable: ${node} on ${size.name}`);
        await p.touchscreen.tap(hit.x,hit.y);await ready(preset);
        if(hash&&await p.evaluate(()=>location.hash)!==hash)throw Error('Wrong route');
        if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Page exceeds viewport');
        if(['flyer','terminal','billboard'].includes(preset)) {
          if(await p.locator('.screen-flat').count())throw Error('Mobile fullscreen fallback used');
          const screen=p.locator(`.kiosk-screens .screen-${preset}.is-on`);
          await screen.waitFor({state:'visible'});
          const r=await screen.boundingBox(),footer=await p.locator('.kiosk-help').boundingBox();
          if(r.x<0 || r.x+r.width>size.width+1 || r.y<70 || r.y+r.height>footer.y-5)throw Error(`Physical screen outside safe viewport: ${preset} ${JSON.stringify(r)}`);
          const overflow=await screen.locator('.screen-scroll').evaluate(e=>e.scrollWidth-e.clientWidth);
          if(overflow>2)throw Error(`Content overflows physical screen: ${preset}: ${overflow}`);
          if(size.name==='phone')await p.screenshot({path:`${output}/phone-${preset}.png`});
        }
        taps.push(node);
        if(node==='hs_flyer'&&size.name==='phone')await p.screenshot({path:`${output}/phone-contacts.png`});
      }
      await home();await p.getByRole('navigation',{name:'Помощь по ларьку'}).getByRole('button',{name:'Внутрь',exact:true}).tap();await ready('inside');
      const tv=await point('hs_tv');if(!tv)throw Error('TV not tappable inside');
      await p.touchscreen.tap(tv.x,tv.y);await ready('tv');
      await p.locator('.kiosk-screens .screen-tv.is-on').waitFor({state:'visible'});
      if(await p.locator('.screen-flat').count())throw Error('TV switched to flat page');
      const tvOverflow=await p.locator('.kiosk-screens .screen-tv.is-on .screen-scroll').evaluate(e=>e.scrollWidth-e.clientWidth);
      if(tvOverflow>2)throw Error(`TV content overflows: ${tvOverflow}`);
      if(size.name==='phone')await p.screenshot({path:`${output}/phone-tv.png`});
      await home();
      // A drag that returns to its starting point must not activate an object.
      const hit=await point('hs_flyer');
      await p.mouse.move(hit.x,hit.y);await p.mouse.down();
      await p.mouse.move(hit.x+30,hit.y,{steps:5});
      await p.mouse.move(hit.x,hit.y,{steps:5});await p.mouse.up();
      if(await p.evaluate(()=>window.__kiosk.current)!=='home')throw Error('Drag activated contact flyer');
      results.push({device:size.name,taps,insideTV:true,noHints:true,noOverflow:true,dragDidNotActivate:true});
    }finally{await c.close();}
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {results,errors};
}

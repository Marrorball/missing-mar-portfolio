async page => {
  const browser=page.context().browser(),results=[],errors=[];
  const base='http://localhost:5173/missing-mar-portfolio/';
  const output='/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/kiosk-mobile-polish';
  for(const size of [{name:'small',width:320,height:568},{name:'phone',width:390,height:844},{name:'wide-phone',width:430,height:932},{name:'landscape',width:844,height:390},{name:'ipad',width:820,height:1180}]) {
    const c=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:true,isMobile:true,reducedMotion:'reduce',deviceScaleFactor:1});
    const p=await c.newPage();p.on('pageerror',e=>errors.push(`${size.name}: ${e.message}`));
    const ready=async preset=>p.waitForFunction(preset=>{window.__kiosk?.frame();return window.__kiosk?.current===preset&&!window.__kiosk.isAnimating&&!document.querySelector('.kiosk-loading');},preset,{timeout:60000});
    const load=async (hash='',preset='home')=>{await p.goto(base+hash);await p.reload();await ready(preset);await p.evaluate(()=>document.fonts.ready);};
    const audit=async preset=>{
      const screen=p.locator(`.kiosk-screens .screen-${preset}.is-on`);await screen.waitFor({state:'visible'});
      await p.waitForFunction(preset=>{const e=document.querySelector(`.kiosk-screens .screen-${preset}`);if(!e||!e.classList.contains('is-on')||e.classList.contains('is-near')||e.style.transform)return false;const r=e.getBoundingClientRect();return Math.abs(r.width-parseFloat(e.style.width))<1&&Math.abs(r.height-parseFloat(e.style.height))<1;},preset);
      if(await p.locator('.screen-flat,.kiosk-touch-label,#kiosk-explore').count())throw Error('Extra mobile UI');
      const r=await screen.boundingBox(),footer=await p.locator('.kiosk-help').boundingBox();
      if(!r||!footer)throw Error(`Missing ${preset} screen/footer on ${size.name}`);
      if(r.x<0||r.x+r.width>size.width+1||r.y<70||r.y+r.height>footer.y-5)throw Error(`${preset} outside viewport`);
      const over=await screen.locator('.screen-scroll').evaluate(e=>e.scrollWidth-e.clientWidth);
      if(over>2)throw Error(`${preset} horizontal overflow ${over}`);
      return r;
    };
    const noOverlap=async (a,b)=>{
      await p.locator(a).waitFor({state:'visible'});await p.locator(b).waitFor({state:'visible'});
      const x=await p.locator(a).boundingBox(),y=await p.locator(b).boundingBox();
      if(!x||!y)throw Error(`Missing controls: ${a}, ${b}`);
      if(x.x<y.x+y.width&&x.x+x.width>y.x&&x.y<y.y+y.height&&x.y+x.height>y.y)throw Error('Controls overlap');
      if(x.x<0||x.x+x.width>size.width+1)throw Error('Controls outside viewport');
    };
    const find=async node=>p.evaluate(node=>{
      const k=window.__kiosk,o=k.scene.getObjectByName(node),pts=[];k.scene.updateMatrixWorld(true);k.camera.updateMatrixWorld();
      o.traverse(m=>{if(!m.geometry)return;m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=k.camera.position.clone().set(x,y,z).applyMatrix4(m.matrixWorld).project(k.camera);pts.push({x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2});}});
      const left=Math.max(2,Math.min(...pts.map(p=>p.x))),right=Math.min(innerWidth-2,Math.max(...pts.map(p=>p.x))),top=Math.max(2,Math.min(...pts.map(p=>p.y))),bottom=Math.min(document.querySelector('.kiosk-help').getBoundingClientRect().top-2,Math.max(...pts.map(p=>p.y)));
      for(let row=0;row<12;row++)for(let col=0;col<12;col++){const x=left+(right-left)*(col+.5)/12,y=top+(bottom-top)*(row+.5)/12;if(k.pick(x,y)===node)return{x,y};}return null;
    },node);
    try {
      await load('#about','billboard');const board=await audit('billboard');
      await p.locator('.screen-billboard.is-on .board-page h1').waitFor({state:'visible'});
      const title=await p.locator('.screen-billboard.is-on .board-page h1').boundingBox();
      if(title.y+title.height>board.y+board.height)throw Error('Banner title below the initial view');
      if(board.width<=480&&await p.locator('.screen-billboard.is-on h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>22.1)throw Error('Banner headline too large');
      await p.screenshot({path:`${output}/${size.name}-banner.png`});
      await p.locator('.screen-billboard.is-on .screen-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);
      if(await p.locator('.screen-billboard.is-on .screen-scroll').evaluate(e=>e.scrollTop)<=0)throw Error('Banner cannot scroll to remaining content');
      await p.locator('.screen-billboard.is-on .screen-scroll').evaluate(e=>e.scrollTop=0);
      await p.locator('.board-tabs a[href="#pricelist"]').tap();
      await p.locator('.board-price').waitFor({state:'visible'});await ready('billboard');await audit('billboard');
      await load();const hit=await find('hs_terminal');if(!hit)throw Error('Terminal not tappable');
      await p.touchscreen.tap(hit.x,hit.y);await p.waitForFunction(()=>window.__kiosk.inFlight);await ready('terminal');const terminal=await audit('terminal');
      const links=await p.locator('.screen-terminal.is-on .terminal-button').evaluateAll(es=>es.map(e=>({href:e.href,r:e.getBoundingClientRect().toJSON()})));
      if(links.length!==3)throw Error('Missing terminal contact');
      await p.screenshot({path:`${output}/${size.name}-terminal.png`});
      if(terminal.width<=480)for(const link of links)if(link.r.height<43.9||link.r.bottom>terminal.y+terminal.height+1)throw Error(`Terminal contact hidden/clipped: ${JSON.stringify(link)}`);
      await p.screenshot({path:`${output}/${size.name}-terminal.png`});
      for(const [hash,preset] of [['#contact','flyer'],['#price','price'],['#catalog','tv']]){await load(hash,preset);await audit(preset);await p.screenshot({path:`${output}/${size.name}-${preset}.png`});}
      await noOverlap('.tv-remote','.kiosk-help');
      const projects=await p.locator('.ttx-list a').evaluateAll(es=>es.map(e=>({hash:e.getAttribute('href'),title:e.querySelector('.ttx-name').textContent})));
      for(const project of size.name==='phone'?projects:projects.slice(0,1)) {
        await p.evaluate(hash=>location.hash=hash,project.hash);
        await p.waitForFunction(title=>document.querySelector('.screen-tv .tv-page h1')?.textContent===title,project.title);
        await ready('tv');await audit('tv');
        await p.locator('.tv-page h1').waitFor({state:'visible'});
        const scroll=p.locator('.screen-tv.is-on .screen-scroll');
        await scroll.evaluate(e=>e.scrollTop=e.scrollHeight);
        if(await scroll.evaluate(e=>e.scrollTop)<=0)throw Error('Project content not scrollable');
        await scroll.evaluate(e=>e.scrollTop=0);
      }
      if(size.name==='phone')await p.screenshot({path:`${output}/phone-project.png`});
      await load();await p.getByRole('navigation',{name:'Помощь по ларьку'}).getByRole('button',{name:'Проекты',exact:true}).tap();await ready('rack');
      await noOverlap('.rack-controls','.kiosk-help');
      const before=await p.evaluate(()=>window.__kiosk.scene.getObjectByName('dvd_rack').rotation.y);
      await p.getByRole('button',{name:'Следующая сторона',exact:true}).tap();await p.waitForTimeout(180);
      const after=await p.evaluate(()=>{window.__kiosk.frame();return window.__kiosk.scene.getObjectByName('dvd_rack').rotation.y;});
      if(Math.abs(after-before)<.02)throw Error('Rack does not animate');
      await p.screenshot({path:`${output}/${size.name}-rack.png`});
      await p.getByRole('navigation',{name:'Помощь по ларьку'}).getByRole('button',{name:'Внутрь',exact:true}).tap();await ready('inside');
      const session=await c.newCDPSession(p);const direction=await p.evaluate(()=>window.__kiosk.camera.quaternion.toArray());
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:size.width*.3,y:size.height*.45}]});
      for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:size.width*(.3+i*.05),y:size.height*.45}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      if(JSON.stringify(direction)===JSON.stringify(await p.evaluate(()=>window.__kiosk.camera.quaternion.toArray())))throw Error('Inside cannot look around by touch');
      if(await p.evaluate(()=>window.__kiosk.current)!=='inside')throw Error('Drag activated an object');
      await p.getByRole('navigation',{name:'Помощь по ларьку'}).getByRole('button',{name:'Выйти',exact:true}).tap();await ready('rack');
      results.push({size:size.name,physicalScreens:5,projects:size.name==='phone'?projects.length:1,allTerminalContactsVisible:true,controlsSeparate:true,rackAnimated:true,insideTouch:true});
    }catch(e){throw Error(`${size.name}: ${e.message}`);}finally{await c.close();}
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {results,errors};
}

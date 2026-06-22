/* ============================================================
   OURAPP MOTION ENGINE
   (c) 2026 Spiridon Tsakonas (Cyrus Nash) - Light in the Dark Solutions
   All Rights Reserved
   Built on the L.I.F.E. Project engine pattern (Three.js r128).
   Each page calls OURAPP.mount('<effectName>').
   All scenes: fixed full-viewport canvas behind content (z-index 0),
   pointer-events:none so every hidden link/click still works.
   ============================================================ */
(function (global) {
  'use strict';
  var THREE = global.THREE;

  // ---- shared scaffold -------------------------------------------------
  function makeStage() {
    var c = document.createElement('div');
    c.id = 'ourapp-scene';
    c.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;';
    document.body.appendChild(c);
    // ensure body content sits above
    if (!document.getElementById('ourapp-zfix')) {
      var st = document.createElement('style');
      st.id = 'ourapp-zfix';
      st.textContent =
        '#ourapp-scene canvas{display:block;width:100%!important;height:100%!important;}' +
        '.reveal{opacity:0;transform:translateY(28px);transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1);}' +
        '.reveal.in{opacity:1;transform:none;}' +
        '.tilt3d{transition:transform .15s ease-out;will-change:transform;backface-visibility:hidden;}' +
        '@media (prefers-reduced-motion: reduce){.reveal{opacity:1;transform:none;transition:none}.tilt3d{transform:none!important}}';
      document.head.appendChild(st);
    }
    return c;
  }

  function baseRenderer(stage) {
    var W = global.innerWidth, H = global.innerHeight;
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(global.devicePixelRatio, 2));
    stage.appendChild(renderer.domElement);
    return renderer;
  }

  function orbitControls(state) {
    // mouse-driven azimuth/polar like the L.I.F.E. chapters
    global.addEventListener('mousemove', function (e) {
      var mx = (e.clientX / global.innerWidth) * 2 - 1;
      var my = (e.clientY / global.innerHeight) * 2 - 1;
      state.targetAz = mx * Math.PI * 0.5;
      state.targetPo = 0.35 - my * 0.25;
    });
    global.addEventListener('touchmove', function (e) {
      if (e.touches.length) {
        var mx = (e.touches[0].clientX / global.innerWidth) * 2 - 1;
        var my = (e.touches[0].clientY / global.innerHeight) * 2 - 1;
        state.targetAz = mx * Math.PI * 0.5;
        state.targetPo = 0.35 - my * 0.25;
      }
    }, { passive: true });
  }

  function onResize(renderer, camera) {
    global.addEventListener('resize', function () {
      var w = global.innerWidth, h = global.innerHeight;
      renderer.setSize(w, h);
      if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    });
  }

  // reveal-on-scroll + optional cursor tilt for [data-tilt]
  function wireReveals() {
    var targets = document.querySelectorAll('h1,h2,h3,p,section,article,table,form,ul,ol,.card,.feature-card,.device-card');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    targets.forEach(function (t) {
      if (t.closest('nav')) return;
      t.classList.add('reveal'); io.observe(t);
    });
    var tilts = document.querySelectorAll('[data-tilt]');
    if (tilts.length) {
      var tx = 0, ty = 0, cx = 0, cy = 0;
      global.addEventListener('mousemove', function (e) {
        tx = (e.clientX / global.innerWidth - 0.5) * 2;
        ty = (e.clientY / global.innerHeight - 0.5) * 2;
      });
      (function loop() {
        requestAnimationFrame(loop);
        cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
        var rx = (-cy * 12).toFixed(2), ry = (cx * 16).toFixed(2);
        tilts.forEach(function (el) {
          el.style.transform = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
        });
      })();
    }
  }

  // ====================================================================
  // EFFECT 1 - STARFIELD WARP  (deep space, stars stream toward you)
  // ====================================================================
  function fxStarfield(opts) {
    opts = opts || {};
    var stage = makeStage();
    var W = global.innerWidth, H = global.innerHeight;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 1000);
    camera.position.z = 1;
    var renderer = baseRenderer(stage);
    var N = 1400, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    var pal = opts.colors || [[0.6, 0.8, 1], [1, 0.85, 0.4], [0.7, 1, 0.85]];
    for (var i = 0; i < N; i++) {
      pos[i*3] = (Math.random() - 0.5) * 600;
      pos[i*3+1] = (Math.random() - 0.5) * 600;
      pos[i*3+2] = -Math.random() * 600;
      var c = pal[(Math.random() * pal.length) | 0];
      col[i*3] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    var stars = new THREE.Points(geo, mat); scene.add(stars);
    var st = { targetAz: 0, targetPo: 0, az: 0, po: 0 }; orbitControls(st);
    var speed = opts.speed || 2.2;
    (function animate() {
      requestAnimationFrame(animate);
      var p = geo.attributes.position.array;
      for (var i = 0; i < N; i++) {
        p[i*3+2] += speed;
        if (p[i*3+2] > 1) { p[i*3+2] = -600; p[i*3] = (Math.random()-0.5)*600; p[i*3+1] = (Math.random()-0.5)*600; }
      }
      geo.attributes.position.needsUpdate = true;
      st.az += (st.targetAz - st.az) * 0.04; st.po += (st.targetPo - st.po) * 0.04;
      stars.rotation.y = st.az * 0.3; stars.rotation.x = st.po * 0.3;
      renderer.render(scene, camera);
    })();
    onResize(renderer, camera);
  }

  // ====================================================================
  // EFFECT 2 - AURORA WAVES  (flowing shader ribbons, calm)
  // ====================================================================
  function fxAurora(opts) {
    opts = opts || {};
    var stage = makeStage();
    var W = global.innerWidth, H = global.innerHeight;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 0, 14);
    var renderer = baseRenderer(stage);
    var uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColA: { value: new THREE.Color(opts.colA || 0x2563eb) },
      uColB: { value: new THREE.Color(opts.colB || 0xfbbf24) },
      uColC: { value: new THREE.Color(opts.colC || 0x34d399) }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms, transparent: true,
      vertexShader:
        'varying vec2 vUv; uniform float uTime; uniform vec2 uMouse;' +
        'void main(){ vUv=uv; vec3 p=position;' +
        'float w=sin(p.x*0.6+uTime*0.8)*1.2+cos(p.y*0.5-uTime*0.6)*1.0;' +
        'p.z+=w + uMouse.x*2.0*sin(p.y*0.3); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
      fragmentShader:
        'varying vec2 vUv; uniform float uTime; uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC;' +
        'void main(){ float t=uTime*0.25;' +
        'float m=sin(vUv.x*6.0+t)*0.5+0.5; float n=cos(vUv.y*5.0-t*1.3)*0.5+0.5;' +
        'vec3 col=mix(uColA,uColB,m); col=mix(col,uColC,n*0.6);' +
        'float a=smoothstep(0.0,0.5,vUv.y)*smoothstep(1.0,0.5,vUv.y)*0.55;' +
        'gl_FragColor=vec4(col,a);}',
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var geo = new THREE.PlaneGeometry(40, 24, 120, 80);
    var mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -0.5; scene.add(mesh);
    var mx = 0, my = 0;
    global.addEventListener('mousemove', function (e) { mx = (e.clientX / global.innerWidth) * 2 - 1; my = (e.clientY / global.innerHeight) * 2 - 1; });
    var clock = new THREE.Clock();
    (function animate() {
      requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.x += (mx - uniforms.uMouse.value.x) * 0.05;
      uniforms.uMouse.value.y += (my - uniforms.uMouse.value.y) * 0.05;
      mesh.rotation.z = uniforms.uMouse.value.x * 0.15;
      renderer.render(scene, camera);
    })();
    onResize(renderer, camera);
  }

  // ====================================================================
  // EFFECT 3 - PARTICLE NETWORK  (constellation, lines link near dots)
  // ====================================================================
  function fxNetwork(opts) {
    opts = opts || {};
    var stage = makeStage();
    var W = global.innerWidth, H = global.innerHeight;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 60;
    var renderer = baseRenderer(stage);
    var N = opts.count || 90, R = 60;
    var pts = [], vel = [];
    var pgeo = new THREE.BufferGeometry(), ppos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var x = (Math.random()-0.5)*R*2, y=(Math.random()-0.5)*R*1.3, z=(Math.random()-0.5)*R*1.3;
      pts.push(new THREE.Vector3(x, y, z));
      vel.push(new THREE.Vector3((Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08));
      ppos[i*3]=x; ppos[i*3+1]=y; ppos[i*3+2]=z;
    }
    pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
    var dotCol = opts.dot || 0xfbbf24;
    scene.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ color: dotCol, size: 1.4, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
    var lgeo = new THREE.BufferGeometry();
    var lmat = new THREE.LineBasicMaterial({ color: opts.line || 0x60a5fa, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
    var lines = new THREE.LineSegments(lgeo, lmat); scene.add(lines);
    var st = { targetAz: 0, targetPo: 0, az: 0, po: 0 }; orbitControls(st);
    (function animate() {
      requestAnimationFrame(animate);
      var lp = [];
      for (var i = 0; i < N; i++) {
        var a = pts[i]; a.add(vel[i]);
        ['x','y','z'].forEach(function(ax){ var lim = ax==='x'?R:R*0.9; if (a[ax]>lim||a[ax]<-lim) vel[i][ax]*=-1; });
        ppos[i*3]=a.x; ppos[i*3+1]=a.y; ppos[i*3+2]=a.z;
        for (var j=i+1;j<N;j++){ var b=pts[j]; if (a.distanceTo(b)<16){ lp.push(a.x,a.y,a.z,b.x,b.y,b.z); } }
      }
      pgeo.attributes.position.needsUpdate = true;
      lgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp), 3));
      st.az += (st.targetAz - st.az) * 0.04; st.po += (st.targetPo - st.po) * 0.04;
      scene.rotation.y = st.az * 0.4; scene.rotation.x = st.po * 0.3;
      renderer.render(scene, camera);
    })();
    onResize(renderer, camera);
  }

  // ====================================================================
  // EFFECT 4 - GLOBE  (rotating wireframe earth, cursor-spun)
  // ====================================================================
  function fxGlobe(opts) {
    opts = opts || {};
    var stage = makeStage();
    var W = global.innerWidth, H = global.innerHeight;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.z = 6;
    var renderer = baseRenderer(stage);

    scene.add(new THREE.AmbientLight(0x46688f, 0.95));  // soft fill so night side stays visible
    var sun = new THREE.DirectionalLight(0xfff6e8, 1.7);
    sun.position.set(-4, 1.5, 3); scene.add(sun);

    // ---- the 7 worlds (NASA / public-domain textures, sovereign-local) ----
    var WORLDS = [
      { name: 'Earth', tex: 'assets/earth_underskin.jpg', tint: 0xcfe6ff, ring: false, page: 'planet-earth.html' },
      { name: 'Moon',  tex: 'assets/planet_moon.jpg',     tint: 0xffffff, ring: false, page: 'planet-moon.html' }
    ];
    var loader = new THREE.TextureLoader();
    var R = 1.0;
    var grp = new THREE.Group(); scene.add(grp);
    var idx = 0;

    var earth = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ emissive: 0x16263d, emissiveIntensity: 0.85, shininess: 16, specular: 0x2a3947 })
    );
    grp.add(earth);

    // Saturn ring (hidden unless Saturn)
    var ringTex = loader.load('assets/saturn_ring.png');
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(R * 1.3, R * 2.1, 64),
      new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = Math.PI * 0.46; ring.visible = false; grp.add(ring);

    function loadWorld(i){
      var w = WORLDS[i];
      loader.load(w.tex, function(tx){
        if (tx.colorSpace !== undefined) tx.colorSpace = THREE.SRGBColorSpace;
        earth.material.map = tx; earth.material.color.setHex(w.tint);
        earth.material.emissive.setHex(0x0a1422); earth.material.emissiveIntensity = 0.5;
        earth.material.needsUpdate = true;
      });
      ring.visible = false;
    }
    loadWorld(0);

    // grounded soft shadow
    var shCanvas = document.createElement('canvas'); shCanvas.width = 256; shCanvas.height = 256;
    var sx = shCanvas.getContext('2d');
    var grad = sx.createRadialGradient(128,128,6,128,128,126);
    grad.addColorStop(0.0,'rgba(0,0,0,0.82)'); grad.addColorStop(0.5,'rgba(0,0,0,0.5)');
    grad.addColorStop(0.8,'rgba(0,0,0,0.18)'); grad.addColorStop(1.0,'rgba(0,0,0,0.0)');
    sx.fillStyle=grad; sx.fillRect(0,0,256,256);
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(R*2.6, R*1.1),
      new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(shCanvas), transparent:true, opacity:0.85, depthWrite:false })
    );
    scene.add(shadow);

    // ---- interaction state ----
    var state = {
      big: false,            // grown to near-screen?
      dragging: false,
      lastX: 0, lastY: 0,
      spinY: 0.0018,         // very slow auto-rotation
      velY: 0, velX: 0,
      manualY: 0, manualX: 0,
      zoom: 6,               // camera distance
      posX: 0, posY: 0,
      tPosX: 0, tPosY: 0
    };
    var dom = renderer.domElement;
    var stageEl = dom.parentNode;
    // small mode: behind content, clicks pass through. only contextmenu is captured globally.
    dom.style.pointerEvents = 'none';

    // ---- small-mode GRAB & DRAG ---------------------------------------
    // The stage canvas is pointer-events:none, so we track everything at the
    // window level using the globe's computed screen position. Hover the globe
    // -> hand cursor. Press & hold -> grab her and drag her anywhere. Release
    // -> she stays where you dropped her. Empty-space moves still let her roam.
    if (!document.getElementById('orrery-cursor-css')) {
      var ccss = document.createElement('style'); ccss.id = 'orrery-cursor-css';
      ccss.textContent = 'body.orrery-grab{cursor:grab!important;} body.orrery-grabbing{cursor:grabbing!important;}';
      document.head.appendChild(ccss);
    }
    state.placing = false;     // true while you hold & drag her
    state.placed   = false;    // true once you have dropped her at a fixed spot
    state.overGlobe = false;

    // is the cursor currently over the globe on screen?
    function cursorOverGlobe(cx, cy){
      if (state.hidden || state.big) return false;
      // project the globe centre to screen
      var v = grp.position.clone(); v.project(camera);
      var sx = (v.x * 0.5 + 0.5) * global.innerWidth;
      var sy = (-v.y * 0.5 + 0.5) * global.innerHeight;
      // approximate on-screen radius of the sphere
      var rPx = (R / camera.position.z) * global.innerHeight * 0.55;
      return Math.hypot(cx - sx, cy - sy) <= rPx;
    }

    global.addEventListener('mousemove', function(e){
      if (state.hidden) return;
      if (state.placing){
        // dragging her: place her where the cursor is (convert screen -> scene units)
        state.tPosX = ((e.clientX/global.innerWidth)*2-1) * 2.4;
        state.tPosY = -((e.clientY/global.innerHeight)*2-1) * 1.3;
        state.posX += (state.tPosX - state.posX) * 0.5;   // tight follow while held
        state.posY += (state.tPosY - state.posY) * 0.5;
        return;
      }
      if (state.dragging && state.big){
        var dx = e.clientX - state.lastX, dy = e.clientY - state.lastY;
        state.manualY += dx * 0.005; state.manualX += dy * 0.005;
        state.velY = dx * 0.0008; state.velX = dy * 0.0008;
        state.lastX = e.clientX; state.lastY = e.clientY;
        return;
      }
      // hover detection -> hand cursor
      var over = cursorOverGlobe(e.clientX, e.clientY);
      state.overGlobe = over;
      document.body.classList.toggle('orrery-grab', over);
      // free roam only when she has NOT been placed and cursor is not on her
      if (!state.big && !state.placed){
        state.tPosX = ((e.clientX/global.innerWidth)*2-1) * 2.4;
        state.tPosY = -((e.clientY/global.innerHeight)*2-1) * 1.3;
      }
    });

    // press on the globe -> start placing (grab)
    global.addEventListener('mousedown', function(e){
      if (state.big || state.hidden) return;
      if (cursorOverGlobe(e.clientX, e.clientY)){
        state.placing = true; state.placed = true;
        document.body.classList.add('orrery-grabbing');
        e.preventDefault();
      }
    });
    global.addEventListener('mouseup', function(){
      if (state.placing){ state.placing = false; document.body.classList.remove('orrery-grabbing'); }
      state.dragging = false;
    });

    // DOUBLE-CLICK ANYWHERE -> hide / show the globe (and free her to roam again)
    global.addEventListener('dblclick', function(e){
      if (state.big) return;
      var el = e.target;
      if (el && el.closest && el.closest('input,textarea,[contenteditable]')) return;
      state.hidden = !state.hidden;
      if (state.hidden){ state.placed = false; }   // when she returns, she roams again
      if (grp) grp.visible = !state.hidden;
      if (typeof shadow !== 'undefined' && shadow) shadow.visible = !state.hidden;
    });
    // wheel zoom (only when big)
    dom.addEventListener('wheel', function(e){
      if (state.big){ e.preventDefault(); state.zoom += e.deltaY * 0.002; state.zoom = Math.max(2.0, Math.min(8, state.zoom)); }
    }, { passive:false });
    // CLICK (no drag) = next world | DOUBLE-CLICK = open history page.
    // A single click waits to see if a second follows, so the two never fight.
    var downX=0, downY=0, clickTimer=null;
    dom.addEventListener('mousedown', function(e){ downX=e.clientX; downY=e.clientY; });
    dom.addEventListener('click', function(e){
      if (!state.big) return;
      var moved = Math.hypot(e.clientX-downX, e.clientY-downY);
      if (moved >= 6) return;            // that was a drag, ignore
      if (clickTimer){ return; }         // second click handled by dblclick
      clickTimer = setTimeout(function(){
        clickTimer = null;
        idx = (idx+1) % WORLDS.length; loadWorld(idx);   // confirmed single click -> next world
      }, 260);
    });
    dom.addEventListener('dblclick', function(e){
      if (!state.big) return;
      if (clickTimer){ clearTimeout(clickTimer); clickTimer = null; }  // cancel the cycle
      var w = WORLDS[idx]; if (w.page){ global.location.href = w.page; } // open history
    });

    // ---- right-click -> REAL-TIME instrument panel (day/night, world clock, moon phase) ----
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;z-index:10000;display:none;background:rgba(8,14,26,0.96);border:1px solid rgba(126,192,255,0.5);border-radius:12px;padding:14px 16px;box-shadow:0 10px 40px rgba(0,0,0,0.7);font-family:Arial,sans-serif;width:280px;backdrop-filter:blur(4px);';
    box.innerHTML =
      '<div style="color:#7ec0ff;font-size:11px;letter-spacing:2px;margin-bottom:10px;border-bottom:1px solid rgba(126,192,255,0.25);padding-bottom:7px;">THE LIVING PLANET \u00b7 RIGHT NOW</div>'+
      '<div style="color:#ffd27a;font-size:12px;margin-bottom:3px;">\u2600\ufe0f DAY &amp; NIGHT</div>'+
      '<div id="orr-daynight" style="color:#dce8f8;font-size:12px;margin-bottom:11px;line-height:1.5;">\u2014</div>'+
      '<div style="color:#9fd0ff;font-size:12px;margin-bottom:3px;">\u23f0 WORLD CLOCK</div>'+
      '<div id="orr-clock" style="color:#dce8f8;font-size:12px;margin-bottom:11px;line-height:1.7;font-variant-numeric:tabular-nums;">\u2014</div>'+
      '<div style="color:#cfd6e0;font-size:12px;margin-bottom:3px;">\U0001f311 MOON TONIGHT</div>'+
      '<div id="orr-moon" style="color:#dce8f8;font-size:12px;line-height:1.5;">\u2014</div>';
    document.body.appendChild(box);

    // ---- pure-local astronomy (no cloud, true every second) ----
    function subsolarLongitude(now){
      // approximate longitude where the sun is directly overhead
      var utcH = now.getUTCHours() + now.getUTCMinutes()/60 + now.getUTCSeconds()/3600;
      return -15 * (utcH - 12); // degrees: +east
    }
    function dayNightText(now){
      var lon = subsolarLongitude(now);
      var side;
      // which broad region currently has the sun overhead
      if (lon > -30 && lon < 60) side = 'Europe, Africa &amp; the Middle East';
      else if (lon >= 60 && lon < 150) side = 'Asia &amp; Australia';
      else if (lon >= 150 || lon < -150) side = 'the Pacific';
      else side = 'the Americas';
      var lonStr = (Math.abs(lon)).toFixed(0) + '\u00b0' + (lon>=0?'E':'W');
      return 'The Sun is overhead near <b style=\"color:#ffe1a8\">'+lonStr+'</b><br>It is midday over '+side+'.';
    }
    function clockText(now){
      var zones = [['Athens','Europe/Athens'],['London','Europe/London'],['New York','America/New_York'],['Tokyo','Asia/Tokyo'],['Sydney','Australia/Sydney']];
      var out = '';
      for (var i=0;i<zones.length;i++){
        var t;
        try { t = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:zones[i][1]}); }
        catch(e){ t = '--:--'; }
        out += '<span style=\"color:#8fb8e0;display:inline-block;width:78px;\">'+zones[i][0]+'</span> <b style=\"color:#fff;\">'+t+'</b><br>';
      }
      return out;
    }
    function moonPhase(now){
      // days since known new moon 2000-01-06 18:14 UTC; synodic month 29.530588853
      var ref = Date.UTC(2000,0,6,18,14,0);
      var days = (now.getTime() - ref) / 86400000;
      var syn = 29.530588853;
      var age = ((days % syn) + syn) % syn;
      var illum = Math.round((1 - Math.cos(2*Math.PI*age/syn))/2 * 100);
      var name, em;
      if (age < 1.85) { name='New Moon'; em='\U0001f311'; }
      else if (age < 5.54) { name='Waxing Crescent'; em='\U0001f312'; }
      else if (age < 9.23) { name='First Quarter'; em='\U0001f313'; }
      else if (age < 12.91) { name='Waxing Gibbous'; em='\U0001f314'; }
      else if (age < 16.61) { name='Full Moon'; em='\U0001f315'; }
      else if (age < 20.30) { name='Waning Gibbous'; em='\U0001f316'; }
      else if (age < 23.99) { name='Last Quarter'; em='\U0001f317'; }
      else if (age < 27.68) { name='Waning Crescent'; em='\U0001f318'; }
      else { name='New Moon'; em='\U0001f311'; }
      return em+' <b style=\"color:#fff;\">'+name+'</b><br>'+illum+'% illuminated \u00b7 '+age.toFixed(1)+' days old';
    }
    var orrTimer=null;
    function refreshPanel(){
      var now = new Date();
      var dn=document.getElementById('orr-daynight'), ck=document.getElementById('orr-clock'), mn=document.getElementById('orr-moon');
      if(dn) dn.innerHTML = dayNightText(now);
      if(ck) ck.innerHTML = clockText(now);
      if(mn) mn.innerHTML = moonPhase(now);
    }
    global.addEventListener('contextmenu', function(e){
      e.preventDefault();
      box.style.left = Math.min(e.clientX, global.innerWidth-300) + 'px';
      box.style.top = Math.min(e.clientY, global.innerHeight-230) + 'px';
      box.style.display = 'block';
      refreshPanel();
      if(orrTimer) clearInterval(orrTimer);
      orrTimer = setInterval(refreshPanel, 1000); // tick every second
    });
    document.addEventListener('click', function(e){
      if (!box.contains(e.target)){ box.style.display='none'; if(orrTimer){clearInterval(orrTimer);orrTimer=null;} }
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){ box.style.display='none'; if(orrTimer){clearInterval(orrTimer);orrTimer=null;} }
    });

    function goBig(){
      state.big = true; state.hidden = false; if(grp) grp.visible = true; state.zoom = 3.0; state.tPosX = 0; state.tPosY = 0;
      if (stageEl){ stageEl.style.zIndex = '9998'; stageEl.style.pointerEvents = 'auto'; }
      dom.style.pointerEvents = 'auto';
      dom.style.cursor = 'grab';
      document.body.classList.add('orrery-big');
      // an exit button to come back
      if (!document.getElementById('orrery-exit')){
        var ex=document.createElement('div'); ex.id='orrery-exit';
        ex.textContent='✕ close globe';
        ex.style.cssText='position:fixed;top:14px;right:16px;z-index:10001;color:#9fc4ff;background:rgba(8,14,26,0.85);border:1px solid rgba(126,192,255,0.5);border-radius:8px;padding:7px 12px;font:13px Arial;cursor:pointer;';
        ex.onclick=function(ev){ ev.stopPropagation(); goSmall(); };
        document.body.appendChild(ex);
      }
      document.getElementById('orrery-exit').style.display='block';
    }
    function goSmall(){
      state.big = false; state.zoom = 6; state.manualX = 0;
      if (stageEl){ stageEl.style.zIndex = '0'; stageEl.style.pointerEvents = 'none'; }
      dom.style.pointerEvents = 'none';
      document.body.classList.remove('orrery-big');
      var ex=document.getElementById('orrery-exit'); if(ex) ex.style.display='none';
    }

    var st = { targetAz:0, targetPo:0, az:0, po:0 }; orbitControls(st);

    (function animate(){
      requestAnimationFrame(animate);
      // very slow constant rotation + manual spin + inertia
      state.velY *= 0.95; state.velX *= 0.95;
      state.manualY += state.velY; state.manualX += state.velX;
      earth.rotation.y += state.spinY + (state.dragging?0:0) ;
      earth.rotation.y += state.velY;
      grp.rotation.y = state.manualY + earth.rotation.y*0; // manual yaw applied to group
      grp.rotation.x = Math.max(-0.6, Math.min(0.6, state.manualX));
      // actually rotate the planet itself for the slow spin
      earth.rotation.y += 0;

      // LIVE TERMINATOR: aim the sun at the real subsolar longitude right now
      var nowS = new Date();
      var utcH = nowS.getUTCHours() + nowS.getUTCMinutes()/60;
      var sunLon = (-15 * (utcH - 12)) * Math.PI/180;  // radians, +east
      sun.position.set(Math.sin(sunLon)*5, 1.2, Math.cos(sunLon)*5);

      // camera zoom ease
      camera.position.z += (state.zoom - camera.position.z) * 0.08;

      // position: small mode follows cursor; big mode centers
      if (state.big){ state.tPosX = 0; state.tPosY = 0; }
      state.posX += (state.tPosX - state.posX) * 0.06;
      state.posY += (state.tPosY - state.posY) * 0.06;
      grp.position.x = state.posX; grp.position.y = state.posY;
      shadow.position.x = state.posX + R*0.35;
      shadow.position.y = state.posY - R*1.15;
      shadow.position.z = -0.2;
      shadow.visible = !state.big; // hide ground shadow in space-big mode

      renderer.render(scene, camera);
    })();
    onResize(renderer, camera);
  }

  // ====================================================================
  // EFFECT 5 - RISING EMBERS  (warm sparks float up, gentle)
  // ====================================================================
  function fxEmbers(opts) {
    opts = opts || {};
    var stage = makeStage();
    var W = global.innerWidth, H = global.innerHeight;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 60;
    var renderer = baseRenderer(stage);
    var N = opts.count || 240, geo = new THREE.BufferGeometry(), pos = new Float32Array(N*3), spd = new Float32Array(N), sway = new Float32Array(N);
    for (var i=0;i<N;i++){ pos[i*3]=(Math.random()-0.5)*140; pos[i*3+1]=(Math.random()-0.5)*120; pos[i*3+2]=(Math.random()-0.5)*60;
      spd[i]=0.05+Math.random()*0.18; sway[i]=Math.random()*6.28; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    var mat = new THREE.PointsMaterial({ color: opts.color || 0xffb347, size: opts.size || 1.5, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    var pts = new THREE.Points(geo, mat); scene.add(pts);
    var st = { targetAz: 0, targetPo: 0, az: 0, po: 0 }; orbitControls(st);
    var t = 0;
    (function animate(){
      requestAnimationFrame(animate); t += 0.016;
      var p = geo.attributes.position.array;
      for (var i=0;i<N;i++){ p[i*3+1]+=spd[i]; p[i*3]+=Math.sin(t+sway[i])*0.05;
        if (p[i*3+1]>60){ p[i*3+1]=-60; p[i*3]=(Math.random()-0.5)*140; } }
      geo.attributes.position.needsUpdate = true;
      st.az += (st.targetAz - st.az)*0.04;
      pts.rotation.y = st.az*0.2;
      renderer.render(scene, camera);
    })();
    onResize(renderer, camera);
  }

  // ====================================================================
  // EFFECT 6 - DNA HELIX  (twin strands rotate, science/dna vibe)
  // ====================================================================
  function fxHelix(opts) {
    opts = opts || {};
    var stage = makeStage();
    var W = global.innerWidth, H = global.innerHeight;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    camera.position.z = 38;
    var renderer = baseRenderer(stage);
    var grp = new THREE.Group(); scene.add(grp);
    var turns = 22, perTurn = 16, total = turns*perTurn;
    var aGeo = new THREE.BufferGeometry(), bGeo = new THREE.BufferGeometry();
    var aPos = new Float32Array(total*3), bPos = new Float32Array(total*3);
    var rungs = [];
    for (var i=0;i<total;i++){ var ang=i*0.4, y=(i/total-0.5)*60, r=6;
      var ax=Math.cos(ang)*r, az=Math.sin(ang)*r, bx=Math.cos(ang+Math.PI)*r, bz=Math.sin(ang+Math.PI)*r;
      aPos[i*3]=ax; aPos[i*3+1]=y; aPos[i*3+2]=az;
      bPos[i*3]=bx; bPos[i*3+1]=y; bPos[i*3+2]=bz;
      if (i%3===0) rungs.push(ax,y,az,bx,y,bz);
    }
    aGeo.setAttribute('position', new THREE.BufferAttribute(aPos,3));
    bGeo.setAttribute('position', new THREE.BufferAttribute(bPos,3));
    grp.add(new THREE.Points(aGeo, new THREE.PointsMaterial({ color: opts.a||0x60a5fa, size:0.7, transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, depthWrite:false })));
    grp.add(new THREE.Points(bGeo, new THREE.PointsMaterial({ color: opts.b||0xfbbf24, size:0.7, transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, depthWrite:false })));
    var rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rungs),3));
    grp.add(new THREE.LineSegments(rGeo, new THREE.LineBasicMaterial({ color: opts.rung||0x34d399, transparent:true, opacity:0.25, blending:THREE.AdditiveBlending })));
    var st = { targetAz: 0, targetPo: 0, az: 0, po: 0 }; orbitControls(st);
    (function animate(){
      requestAnimationFrame(animate);
      st.az += (st.targetAz - st.az)*0.05; st.po += (st.targetPo - st.po)*0.05;
      grp.rotation.y += 0.006 + st.az*0.03; grp.rotation.z = st.po*0.25;
      renderer.render(scene, camera);
    })();
    onResize(renderer, camera);
  }

  // ====================================================================
  // EFFECT 7 - LIQUID GRID  (undulating wireframe terrain, like L.I.F.E.)
  // ====================================================================
  function fxGrid(opts) {
    opts = opts || {};
    var stage = makeStage();
    var W = global.innerWidth, H = global.innerHeight;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.set(0, 8, 24);
    camera.lookAt(0, 0, 0);
    var renderer = baseRenderer(stage);
    var geo = new THREE.PlaneGeometry(120, 120, 80, 80);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshBasicMaterial({ color: opts.color || 0x2563eb, wireframe: true, transparent: true, opacity: 0.35 });
    var mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
    var base = geo.attributes.position.array.slice();
    var mx = 0, my = 0;
    global.addEventListener('mousemove', function (e) { mx = (e.clientX/global.innerWidth)*2-1; my=(e.clientY/global.innerHeight)*2-1; });
    var t = 0;
    (function animate(){
      requestAnimationFrame(animate); t += 0.02;
      var p = geo.attributes.position.array;
      for (var i=0;i<p.length;i+=3){ var x=base[i], z=base[i+2];
        p[i+1]=Math.sin(x*0.15+t)*1.6 + Math.cos(z*0.18+t*0.8)*1.6; }
      geo.attributes.position.needsUpdate = true;
      camera.position.x += (mx*6 - camera.position.x)*0.04;
      camera.position.y += ((6 - my*3) - camera.position.y)*0.04;
      camera.lookAt(0,0,0);
      renderer.render(scene, camera);
    })();
    onResize(renderer, camera);
  }

  // ---- public API ------------------------------------------------------
  // ====================================================================
  // CONFETTI - non-stop celebration, drifts down over the whole page,
  // own canvas on TOP, pointer-events:none so clicks pass through.
  // ====================================================================
  function confetti(opts) {
    opts = opts || {};
    var cv = document.createElement('canvas');
    cv.id = 'ourapp-confetti';
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    function size(){ cv.width = global.innerWidth; cv.height = global.innerHeight; }
    size(); global.addEventListener('resize', size);
    var colors = opts.colors || ['#fbbf24','#34d399','#60a5fa','#f472b6','#f87171','#a78bfa','#ffffff'];
    var N = opts.count || 280;
    var bits = [];
    function spawn(y){
      return { x: Math.random()*cv.width,
               y: (y===undefined ? Math.random()*cv.height : y),
               w: 6+Math.random()*7, h: 9+Math.random()*9,
               c: colors[(Math.random()*colors.length)|0],
               rot: Math.random()*6.28, vr: (Math.random()-0.5)*0.2,
               vy: 1.1+Math.random()*2.4, vx: (Math.random()-0.5)*1.2,
               sway: Math.random()*6.28, sw: 0.02+Math.random()*0.04 };
    }
    for (var i=0;i<N;i++) bits.push(spawn());
    (function loop(){
      requestAnimationFrame(loop);
      ctx.clearRect(0,0,cv.width,cv.height);
      for (var i=0;i<bits.length;i++){
        var b=bits[i];
        b.sway+=b.sw; b.y+=b.vy; b.x+=b.vx+Math.sin(b.sway)*0.8; b.rot+=b.vr;
        if (b.y > cv.height+20){ bits[i]=spawn(-20); }   // recycle -> NON-STOP
        ctx.save();
        ctx.translate(b.x,b.y); ctx.rotate(b.rot);
        ctx.fillStyle=b.c; ctx.globalAlpha=0.9;
        ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h);
        ctx.restore();
      }
    })();
  }

  var FX = {
    starfield: fxStarfield, aurora: fxAurora, network: fxNetwork,
    globe: fxGlobe, embers: fxEmbers, helix: fxHelix, grid: fxGrid, confetti: confetti
  };

  function mount(name, opts) {
    function go() {
      try {
        if (THREE && FX[name]) FX[name](opts);
      } catch (err) { /* scene fails silently, page still works */ }
      wireReveals();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }

  global.OURAPP = { mount: mount, fx: FX, confetti: confetti };
})(window);

/* ============================================================
   BANNER SPIN  (c) 2026 Light in the Dark Solutions
   Every banner button rotates on Y axis driven by cursor X.
   A full sweep across the viewport width = 1080deg (3 full turns).
   Auto-detects banners site-wide; no per-page edits needed.
   ============================================================ */
(function (global) {
  'use strict';
  function initBannerSpin() {
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Selectors that match the gold/gradient pill banners across all pages
    var sel = [
      'a[href="github-tribute.html"]',
      '.headline-link-main', '.headline-link-earth',
      'a.headline-link',
      'a[class*="bg-gradient-to-r"]'
    ].join(',');
    var banners = Array.prototype.slice.call(document.querySelectorAll(sel));
    // de-dupe
    banners = banners.filter(function (el, i) { return banners.indexOf(el) === i; });
    if (!banners.length) return;
    banners.forEach(function (el) {
      el.style.display = el.style.display || 'inline-block';
      el.style.transformStyle = 'preserve-3d';
      el.style.willChange = 'transform';
      el.setAttribute('data-banner-spin', '1');
    });
    var targetDeg = 0, curDeg = 0;
    global.addEventListener('mousemove', function (e) {
      var f = e.clientX / global.innerWidth;          // 0 .. 1 across width
      targetDeg = f * 1080;                            // 3 x 360
    });
    (function loop() {
      requestAnimationFrame(loop);
      curDeg += (targetDeg - curDeg) * 0.1;            // smooth follow
      var t = 'perspective(900px) rotateY(' + curDeg.toFixed(2) + 'deg)';
      banners.forEach(function (el) { el.style.transform = t; });
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBannerSpin);
  else initBannerSpin();
})(window);

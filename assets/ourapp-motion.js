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
    var camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.z = 5;
    var renderer = baseRenderer(stage);
    var grp = new THREE.Group(); scene.add(grp);
    var globe = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 48),
      new THREE.MeshBasicMaterial({ color: opts.core || 0x0a2a66, transparent: true, opacity: 0.45 }));
    grp.add(globe);
    grp.add(new THREE.Mesh(new THREE.SphereGeometry(1.63, 28, 28),
      new THREE.MeshBasicMaterial({ color: opts.wire || 0x34d399, wireframe: true, transparent: true, opacity: 0.28 })));
    // orbiting points
    var N = 220, g = new THREE.BufferGeometry(), p = new Float32Array(N*3);
    for (var i=0;i<N;i++){ var ph=Math.acos(2*Math.random()-1), th=2*Math.PI*Math.random(), r=1.66;
      p[i*3]=r*Math.sin(ph)*Math.cos(th); p[i*3+1]=r*Math.sin(ph)*Math.sin(th); p[i*3+2]=r*Math.cos(ph); }
    g.setAttribute('position', new THREE.BufferAttribute(p,3));
    grp.add(new THREE.Points(g, new THREE.PointsMaterial({ color: opts.dot || 0xfbbf24, size: 0.04, transparent: true, opacity: 0.9 })));
    var ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.13, 80),
      new THREE.MeshBasicMaterial({ color: opts.ring || 0x60a5fa, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    ring.rotation.x = Math.PI*0.5; grp.add(ring);
    var st = { targetAz: 0, targetPo: 0, az: 0, po: 0 }; orbitControls(st);
    (function animate(){
      requestAnimationFrame(animate);
      st.az += (st.targetAz - st.az)*0.05; st.po += (st.targetPo - st.po)*0.05;
      grp.rotation.y += 0.0025 + st.az*0.04; grp.rotation.x = st.po*0.5;
      ring.rotation.z += 0.003;
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
  var FX = {
    starfield: fxStarfield, aurora: fxAurora, network: fxNetwork,
    globe: fxGlobe, embers: fxEmbers, helix: fxHelix, grid: fxGrid
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

  global.OURAPP = { mount: mount, fx: FX };
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

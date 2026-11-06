/**
 * LIQUID GLASS · WebGL2 折射层
 * ------------------------------------------------------------
 * 把 AI 生成的琉璃视频作为纹理，用一层全屏 shader 做：
 *   液态噪声位移 + RGB 三通道色散 + 菲涅尔边缘光 + 玻璃棱边高光
 *
 * 零依赖：手写 WebGL2，不引入 Three.js（约 600KB）。
 * 降级：WebGL2 不可用 / 移动端 / 性能不足时，不创建画布，
 *       由原 <video> 直接呈现，功能不受影响。
 */
(function () {
  'use strict';

  const canvas = document.getElementById('hero-glass');
  const video = document.querySelector('.hero-media video');
  if (!canvas || !video) return;

  // 性能与设备门槛：移动端、低核数、明确偏好静态的用户直接走降级
  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isMobile || cores < 4 || reduced) return;

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return;

  const VERT = `#version 300 es
  in vec2 aPos;
  out vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;
  in  vec2 vUv;
  out vec4 outColor;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main(){
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * aspect, uv.y) * 2.4;
    float t = uTime * 0.06;

    float n1 = fbm(p + vec2(t, -t * 0.6));
    float n2 = fbm(p * 1.7 + vec2(-t * 0.8, t * 0.5) + n1);

    // 指针附近的液态凸起
    vec2 m = vec2(uMouse.x * aspect, uMouse.y);
    vec2 d = p - m;
    float infl = 0.22 / (1.0 + dot(d, d) * 3.0);

    vec2 disp = (vec2(n1, n2) - 0.5) * 0.034 + d * infl * 0.02;

    // 三通道不同偏移 → 琉璃色散
    float amt = 0.006 + 0.004 * sin(t * 2.0);
    vec3 col;
    col.r = texture(uTex, uv + disp * (1.00)).r;
    col.g = texture(uTex, uv + disp * (1.25)).g;
    col.b = texture(uTex, uv + disp * (1.55)).b;

    // 玻璃体：中心通透、边缘增亮
    vec2 c = uv - 0.5;
    float fres = pow(max(0.0, 1.0 - abs(c.x) * 1.45), 3.0);
    col *= 0.90 + 0.24 * fres;

    // 棱边高光
    float edge = smoothstep(0.40, 0.5, abs(c.x));
    col += edge * vec3(0.13, 0.19, 0.27);

    outColor = vec4(col, 1.0);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      window.__glassErr = 'shader: ' + gl.getShaderInfoLog(s);
      console.warn('[glass] shader 编译失败:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    window.__glassErr = 'link: ' + gl.getProgramInfoLog(prog);
    console.warn('[glass] program 链接失败:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // 全屏三角形
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTex = gl.getUniformLocation(prog, 'uTex');
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(uTex, 0);

  const mouse = { x: 0.5, y: 0.5 };
  const target = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', (e) => {
    target.x = e.clientX / window.innerWidth;
    target.y = 1 - e.clientY / window.innerHeight;
  }, { passive: true });

  function resize() {
    if (canvas.style.display === 'none') return; // 已降级为原生视频，不再维护画布尺寸
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = Math.floor(canvas.clientWidth * dpr);
    let h = Math.floor(canvas.clientHeight * dpr);
    // 限制内部渲染分辨率：视频纹理每帧全量上传，分辨率越高压力越大。
    // 1600×900 在视觉上与原生分辨率无明显差异，但帧率稳定得多。
    const MAXW = 1600, MAXH = 900;
    const scale = Math.min(1, MAXW / w, MAXH / h);
    w = Math.max(1, Math.floor(w * scale));
    h = Math.max(1, Math.floor(h * scale));
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  window.addEventListener('resize', resize);

  let visible = false;
  let last = performance.now();
  let start = last;
  let frames = 0;
  let fpsWindow = last;
  let degraded = false;
  let lowStreak = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    window.__glassLoops = (window.__glassLoops || 0) + 1;
    try {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // 视频未就绪时不上传纹理，避免黑帧
      if (video.readyState < 2) {
        window.__glassWait = video.readyState;
        return;
      }
      window.__glassReady = video.readyState;

      resize();

      mouse.x += (target.x - mouse.x) * 0.06;
      mouse.y += (target.y - mouse.y) * 0.06;

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      window.__glassPass = (window.__glassPass || 0) + 1;
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!visible) {
        visible = true;
        canvas.classList.add('on');
      }

      // 动态降级：连续低帧则停掉渲染，保留静态视频
      frames++;
      if (now - fpsWindow > 1500) {
        const fps = frames / ((now - fpsWindow) / 1000);
        fpsWindow = now;
        frames = 0;
        lowStreak = (fps < 24) ? lowStreak + 1 : 0;
        if (lowStreak >= 2 && !degraded) {
          degraded = true;
          canvas.classList.remove('on');
          canvas.style.display = 'none';
          console.info('[glass] 帧率不足，已降级为静态视频');
        }
      }
    } catch (e) {
      // 任何异常都不允许中断渲染循环，也不允许影响页面其它部分
      window.__glassCatches = (window.__glassCatches || 0) + 1;
      window.__glassErr = 'loop: ' + (e && e.message ? e.message : String(e));
      console.warn('[glass] 渲染异常:', e);
    }
  }

  // 页面不可见时暂停，省电省 GPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      video.pause();
    } else if (!degraded) {
      video.play().catch(() => {});
    }
  });

  requestAnimationFrame(loop);

  // 看门狗：若在限定时间内仍未成功出帧（设备不支持视频纹理、驱动异常等），
  // 直接放弃 WebGL 层，退回浏览器原生视频播放，绝不让背景空白。
  setTimeout(function () {
    if (!visible) {
      canvas.classList.remove('on');
      canvas.style.display = 'none';
      console.info('[glass] 未能出帧，已退回原生视频');
    }
  }, 3500);
})();

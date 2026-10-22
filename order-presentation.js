function injectVideoCSS() {
  $('head').append(`<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">`);
  $('body').append(`
    <style>
        #videoModal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background: #000; z-index:99999; flex-direction:column; align-items:center; justify-content:center; }
        .video-container { position: relative; width: 320px; height: 576px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid #333; }
        video { width: 100%; height: 100%; object-fit: cover; }
        .digital-label { position: absolute; top: 67%; left: 53%; transform: translate(-30%, -50%) scale(0.7); width: 128px; height: 128px; border-radius: 50%; background: radial-gradient(circle, #ffffff 40%, #ffe6a0 100%); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; z-index: 10; opacity: 0; transition: all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1); }
        .digital-label.visible { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        .content-group { display: flex; flex-direction: column; align-items: center; transition: transform 0.8s ease-in-out; }
        .digital-label img { width: 60px; opacity: 0.95; margin-bottom: 2px; }
        .packed-text { font-family: 'Montserrat', sans-serif; font-size: 10px; color: #5d4037; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }
        .digital-label.final-state .content-group { transform: translateY(-18px) scale(0.9); }
        .check-wrapper { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%) scale(0); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.27); }
        .check-wrapper.show { transform: translateX(-50%) scale(1); }
        .checkmark-svg { width: 28px; height: 28px; stroke: #28a745; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; fill: none; stroke-dasharray: 50; stroke-dashoffset: 50; transition: stroke-dashoffset 0.4s ease-in-out; }
        .check-wrapper.draw .checkmark-svg { stroke-dashoffset: 0; }
        .name-wrapper { position: absolute; top: 50%; left: 50%; z-index: 999; transform: translate(-100%, -250%) scale(1.2); opacity: 0; transition: all 1s cubic-bezier(0.25, 1, 0.5, 1); display: flex; justify-content: center; align-items: center; width: 100%; }
        .user-name { font-family: 'Courier New', monospace; font-size: 25px; font-weight: 900; color: #ffffff; text-transform: uppercase; padding-bottom: 2px; background-color: #000000; height: 32px; display: flex; align-items: center; justify-content: center; width: auto; min-width: 163px; padding-left: 15px; padding-right: 15px; padding-top: 2px; border-radius: 10px; box-shadow: 0px 4px 8px rgba(0,0,0,0.3); white-space: nowrap; }
        .name-wrapper.show-big { opacity: 1; transform: translate(-50%, -250%) scale(1.2); }
        .name-wrapper.docked { top: 67%; left: 53%; transform: translate(-50%, 2px) scale(0.5); opacity: 1; }
        .loading-txt { color: #d4a017; margin-top: 20px; font-family: sans-serif; font-size: 12px; letter-spacing: 2px; opacity: 0.8; }
    </style>
    <div id="videoModal">
        <div class="video-container">
            <video id="honeyVideo" muted playsinline preload="none"><source src="honey_rotate.mp4" type="video/mp4"></video>
            <div class="digital-label" id="customLabel">
                <div class="content-group"><img src="logo.png" alt="Kafak"><div class="packed-text" data-i18n="lbl_reserved_for">RESERVED FOR</div></div>
                <div class="check-wrapper" id="finalCheck"><svg class="checkmark-svg" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"></path></svg></div>
            </div>
            <div class="name-wrapper" id="nameBadge"><div class="user-name" id="vid-username"></div></div>
        </div>
        <div class="loading-txt" data-i18n="lbl_preparing">PREPARING YOUR ORDER...</div>
    </div>`);
}

let honeyVideoPreload, honeyVideoURL, honeyVideoFile, honeyVideoController;
function preloadHoneyVideo() {
 const video=document.getElementById('honeyVideo');if(!video)return;
 if(!honeyVideoPreload){
  video.preload='auto';video.dataset.preloaded='true';
  // Fetch once in the background: Safari may ignore preload for hidden videos.
  honeyVideoFile ||= video.canPlayType('video/mp4; codecs="avc1.42E01E"')?'honey_rotate.mp4':'honey_rotate.webm';
  honeyVideoController=new AbortController();
  honeyVideoPreload=fetch(honeyVideoFile,{cache:'force-cache',signal:honeyVideoController.signal}).then(response=>{if(!response.ok)throw Error('Video unavailable');return response.blob();}).then(blob=>{
   honeyVideoURL ||= URL.createObjectURL(blob);
   if(!orderPresentation){video.src=honeyVideoURL;video.load();}
   return blob;
  }).catch(()=>{honeyVideoPreload=null;});
 }
 return honeyVideoPreload;
}

let orderAnimationTimers = [];
let orderNameInterval = null;
let orderPresentation = null;
function stopOrderAnimation() {
  $('#animation-recovery').remove();
  orderAnimationTimers.forEach(clearTimeout);
  orderAnimationTimers = [];
  clearInterval(orderNameInterval);
  orderNameInterval = null;
  const video = document.getElementById('honeyVideo');
  if (video) { video.pause(); video.onended = null; video.onerror = null; video.onplaying = null; video.onwaiting = null; }
  orderPresentation = null;
}

function finishOrderPresentation() {
  const state = orderPresentation;
  if (!state || state.finished || !state.videoDone || !state.nameDone || !window.orderSuccess) return;
  state.finished = true;
  $('#finalCheck').addClass('show');
  orderAnimationTimers.push(setTimeout(() => $('#finalCheck').addClass('draw'), 100));
  orderAnimationTimers.push(setTimeout(() => {
    stopOrderAnimation();
    showLoader(false); $('#videoModal').fadeOut(); window.kafakRecovery?.completed(); $('#order-form').hide(); $('#showsuccess').fadeIn();
    updateFooterButtons('none'); setTimeout(sendToWhatsapp, 1500);
  }, 600));
}

function playVideoAnimation(userName, apiCallback) {
  stopOrderAnimation();
  $('#videoModal').css('display', 'flex').fadeIn();
  const video = document.getElementById('honeyVideo');
  const label = $('#customLabel');
  const nameBadge = $('#nameBadge');
  const checkWrapper = $('#finalCheck');
  const nameBox = document.getElementById('vid-username');

  label.removeClass('visible final-state');
  nameBadge.removeClass('show-big docked');
  checkWrapper.removeClass('show draw');
  nameBox.textContent = "";

  let fontSize = 25;
  if (userName.length > 20) fontSize = 16; else if (userName.length > 12) fontSize = 20;
  $('#vid-username').css('font-size', fontSize + 'px');

  window.orderSuccess = false;
  const state = orderPresentation = { videoDone: false, nameDone: false, finished: false };
  const videoComplete = () => { if (orderPresentation !== state) return; state.videoDone = true; finishOrderPresentation(); };
  video.onended = videoComplete;
  // Media is optional; the server result is never optional.
  const skipVideo=()=>{
    if(orderPresentation!==state||state.finished)return;
    orderAnimationTimers.forEach(clearTimeout);orderAnimationTimers=[];
    clearInterval(orderNameInterval);orderNameInterval=null;
    video.onplaying=null;video.onwaiting=null;video.onerror=null;video.onended=null;video.pause();
    state.videoDone=true;state.nameDone=true;state.skipped=true;
    if(!honeyVideoURL)honeyVideoController?.abort();
    $('#videoModal').hide();showLoader(true);finishOrderPresentation();
  };
  if(!honeyVideoURL){skipVideo();apiCallback();return;}
  video.onerror=skipVideo;
  video.onplaying=()=>{clearTimeout(state.stallTimer);startNameTimeline();};
  video.onwaiting=()=>{clearTimeout(state.stallTimer);state.stallTimer=setTimeout(skipVideo,2000);orderAnimationTimers.push(state.stallTimer);};
  video.src=honeyVideoURL;video.currentTime=0;
  video.play().catch(skipVideo);
  state.stallTimer=setTimeout(()=>{if(video.paused||video.readyState<3)skipVideo();},2000);
  orderAnimationTimers.push(state.stallTimer);

  apiCallback();

  function startNameTimeline(){
  if(state.timelineStarted)return;state.timelineStarted=true;
  const later = (fn, delay) => orderAnimationTimers.push(setTimeout(fn, delay));
  later(() => { label.addClass('visible'); }, 4700);
  later(() => { nameBadge.addClass('show-big'); }, 5500);
  later(() => {
    let i = 0; let text = userName.replace(/ /g, "\u00A0"); nameBox.textContent = "";
    orderNameInterval = setInterval(() => { if (i < text.length) { nameBox.textContent += text.charAt(i); i++; } else { clearInterval(orderNameInterval); orderNameInterval = null; } }, 80);
  }, 5800);
  const dockAt = Math.max(7800, 5800 + userName.length * 80 + 300);
  later(() => { nameBadge.removeClass('show-big').addClass('docked'); label.addClass('final-state'); }, dockAt);
  later(() => { state.nameDone = true; finishOrderPresentation(); }, dockAt + 500);
  }
}


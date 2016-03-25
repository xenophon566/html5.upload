/**
* My Upload Plugin - Image Utility Tool Kit (Canvas)
*
* @Date 	20140205
* @Author 	ShawnWu
* @Version 	release v4.0.20160225
* @Describe image webworker
* @License 	under the MIT License
**/
self.addEventListener('message', function(e){
	var sBufferData = e.data['sBuffer'].data, scale = e.data['scale'], cvWidth = e.data['width'], cvHeight = e.data['height'];	//from main thread
	var sq = scale*scale,	//pixel of source within target
		sw = cvWidth, sh = cvHeight,	//source width height
		tw = Math.floor(sw * scale), th = Math.floor(sh * scale),	//target width height
		sx = 0, sy = 0, sIdx = 0,	//source x y and pixel index of source array
		tx = 0, ty = 0, tIdx = 0,	//target x y and pixel index of target array
		TX = 0, TY = 0, yIdx = 0, pxIndex = 0,	//rounded tx ty
		w = 0, nw = 0, wx = 0, nwx = 0, wy = 0, nwy = 0,	//weight / next weight x / y
		sR = 0, sG = 0, sB = 0,	//source RGB
		crossX = false, crossY = false,	//scaled px cross current px border
		tBuffer = new Float32Array(3 * sw * sh),    //buffer of scale source to target
        rBuffer = typeof(Uint8ClampedArray) == 'function' ? new Uint8ClampedArray(4 * tw * th) : new Uint16Array(4 * tw * th); //buffer of target to result canvas

	//RGB of source to target
	for( sy=0; sy<sh; sy++ ) {
		ty = sy * scale; TY = 0 | ty; yIdx = 3 * TY * tw; crossY = (TY != (0 | ty + scale));
		if(crossY) { wy = (TY + 1 - ty); nwy = (ty + scale - TY - 1); }
		for( sx=0; sx<sw; sx++, sIdx+=4 ) {
			tx = sx * scale; TX = 0 | tx; tIdx = yIdx + TX * 3; crossX = (TX != (0 | tx + scale));
			if(crossX) { wx = (TX + 1 - tx); nwx = (tx + scale - TX - 1); }
			//image refined
			sR = sBufferData[sIdx+0]; sG = sBufferData[sIdx+1]; sB = sBufferData[sIdx+2];	//get source RGB
			if(!crossX && !crossY) {	//NO pixel cross
				tBuffer[tIdx+0] += sR * sq; tBuffer[tIdx+1] += sG * sq; tBuffer[tIdx+2] += sB * sq;
			} else if(crossX && !crossY) { //X cross only
				w = wx * scale;		//add weighted component for current px
				tBuffer[tIdx+0] += sR * w; tBuffer[tIdx+1] += sG * w; tBuffer[tIdx+2] += sB * w;
				nw = nwx * scale	//add weighted component for next (TX+1) px
				tBuffer[tIdx+3] += sR * nw; tBuffer[tIdx+4] += sG * nw; tBuffer[tIdx+5] += sB * nw;
			} else if(crossY && !crossX) { //Y cross only
				w = wy * scale;		//add weighted component for current px
				tBuffer[tIdx+0] += sR * w; tBuffer[tIdx+1] += sG * w; tBuffer[tIdx+2] += sB * w;
				nw = nwy * scale	//add weighted component for next (TY+1) px
				tBuffer[tIdx+3 * tw+0] += sR * nw; tBuffer[tIdx+3 * tw+1] += sG * nw; tBuffer[tIdx+3 * tw+2] += sB * nw;
			} else {	//XY cross both
				w = wx * wy;	//add weighted component for current px
				tBuffer[tIdx+0] += sR * w; tBuffer[tIdx+1] += sG * w; tBuffer[tIdx+2] += sB * w;
				nw = nwx * wy;	//for TX + 1; TY px
				tBuffer[tIdx+3] += sR * nw; tBuffer[tIdx+4] += sG * nw; tBuffer[tIdx+5] += sB * nw;
				nw = nwy * wx;	//for TX ; TY + 1 px
				tBuffer[tIdx+3 * tw+0] += sR * nw; tBuffer[tIdx+3 * tw+1] += sG * nw; tBuffer[tIdx+3 * tw+2] += sB * nw;
				nw = nwx * nwy;	//for TX + 1 ; TY +1 px
				tBuffer[tIdx+3 * tw+3] += sR * nw; tBuffer[tIdx+3 * tw+4] += sG * nw; tBuffer[tIdx+3 * tw+5] += sB * nw;
			}
		}
	}

	//RGBA of target to result canvas
	for( sIdx=0, tIdx=0; pxIndex < tw*th; sIdx+=3, tIdx+=4, pxIndex++ ) {
		rBuffer[tIdx + 0] = Math.round(tBuffer[sIdx + 0]);
		rBuffer[tIdx + 1] = Math.round(tBuffer[sIdx + 1]);
		rBuffer[tIdx + 2] = Math.round(tBuffer[sIdx + 2]);
		rBuffer[tIdx + 3] = 255;
	}

	self.postMessage(rBuffer);

	e = rBuffer = tBuffer = sBufferData = undefined; self.close();
}, false);

/**
* My Upload Plugin - Image Utility Tool
* 
* @Date 	20140205
* @Author 	ShawnWu
* @Version 	release v3.0.20140227
* @License 	under the MIT License
**/
var imageUtility = (function(){
	var resizeMAX = function(MAX_WIDTH, MAX_HEIGHT, width, height) {
		var ratio = 1; if( !width || !height ) return;
		if( MAX_WIDTH && MAX_HEIGHT ) {
			if( width > height ) {
				if( width > MAX_WIDTH ) { ratio = MAX_WIDTH/width; height *= MAX_WIDTH/width; width = MAX_WIDTH; }
			} else {
				if( height > MAX_HEIGHT ) { ratio = MAX_HEIGHT/height; width *= MAX_HEIGHT/height; height = MAX_HEIGHT; }
			}
		} else if( MAX_WIDTH && !MAX_HEIGHT ) {
			if( width > MAX_WIDTH ) { ratio = MAX_WIDTH/width; height *= MAX_WIDTH/width; width = MAX_WIDTH; }
		} else if( !MAX_WIDTH && MAX_HEIGHT ) {
			if( height > MAX_HEIGHT ) { ratio = MAX_HEIGHT/height; width *= MAX_HEIGHT/height; height = MAX_HEIGHT; }
		}
		return [ratio, width, height];
	}
	
	var resizeMIN = function(MIN_WIDTH, MIN_HEIGHT, width, height) {
		var ratio = 1; if( !width || !height ) return;
		if( MIN_WIDTH && MIN_HEIGHT ) {			
			if( width < height ) {
				if( width < MIN_WIDTH ) { ratio = MIN_WIDTH/width; height *= MIN_WIDTH/width; width = MIN_WIDTH; }
			} else {
				if( height < MIN_HEIGHT ) { ratio = MIN_HEIGHT/height; width *= MIN_HEIGHT/height; height = MIN_HEIGHT; }
			}
		} else if( MIN_WIDTH && !MIN_HEIGHT ) {			
			if( width < MIN_WIDTH ) { ratio = MIN_WIDTH/width; height *= MIN_WIDTH/width; width = MIN_WIDTH; }
		} else if( !MIN_WIDTH && MIN_HEIGHT ) {
			if( height < MIN_HEIGHT ) { ratio = MIN_HEIGHT/height; width *= MIN_HEIGHT/height; height = MIN_HEIGHT; }
		}
		return [ratio, width, height];
	}
	
	var fineScale = function(image, scale) {
		//get source and target canvas
		var cv = document.createElement("canvas"); cv.width = image.width; cv.height = image.height;
			cv.getContext("2d").drawImage(image, 0, 0);
		var sq = scale*scale,	//pixel of source within target
			sw = cv.width, sh = cv.height,	//source width height
			sx = 0, sy = 0, sIdx = 0,	//source x y and pixel index of source array
			tw = Math.floor(sw * scale), th = Math.floor(sh * scale),	//target width height
			tx = 0, ty = 0, tIdx = 0,	//target x y and pixel index of target array
			TX = 0, TY = 0, yIdx = 0,	//rounded tx ty
			w = 0, nw = 0, wx = 0, nwx = 0, wy = 0, nwy = 0,	//weight / next weight x / y
			sR = 0, sG = 0, sB = 0,	//source RGB
			crossX = false, crossY = false,	//scaled px cross current px border
			sBuffer = cv.getContext("2d").getImageData(0, 0, sw, sh).data,	//get source buffer 8 bit rgba
			tBuffer = new Float32Array(3 * sw * sh); //put target buffer Float32 rgb
		
		//create result canvas
		var resultCV = document.createElement("canvas"); resultCV.width = tw; resultCV.height = th;
		var resultCTX = resultCV.getContext("2d"),	//canvas result context
			resultIMG = resultCTX.getImageData(0, 0, tw, th),	//result image
			tByteBuffer = resultIMG.data,	//result image buffer
			pxIndex = 0;	//number of total pixel
		
		for( sy=0; sy<sh; sy++ ) {
			ty = sy * scale; TY = 0 | ty; yIdx = 3 * TY * tw; crossY = (TY != (0 | ty + scale));
			if(crossY) {
				wy = (TY + 1 - ty);
				nwy = (ty + scale - TY - 1);
			}
			for( sx=0; sx<sw; sx++, sIdx+=4 ) {
				tx = sx * scale; TX = 0 | tx; tIdx = yIdx + TX * 3; crossX = (TX != (0 | tx + scale));
				if(crossX) {
					wx = (TX + 1 - tx);
					nwx = (tx + scale - TX - 1);
				}
				//image refined
				sR = sBuffer[sIdx+0]; sG = sBuffer[sIdx+1]; sB = sBuffer[sIdx+2];	//get source RGB
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

		//convert float32 array into a UInt8Clamped Array
		for( sIdx=0, tIdx=0; pxIndex < tw*th; sIdx+=3, tIdx+=4, pxIndex++ ) {
			tByteBuffer[tIdx + 0] = Math.ceil(tBuffer[sIdx + 0]);
			tByteBuffer[tIdx + 1] = Math.ceil(tBuffer[sIdx + 1]);
			tByteBuffer[tIdx + 2] = Math.ceil(tBuffer[sIdx + 2]);
			tByteBuffer[tIdx + 3] = 255;
		}
		
		resultCTX.putImageData(resultIMG, 0, 0);
		return resultCV;
	}
	
	return {
		imgResizeMAX : function(MAX_WIDTH, MAX_HEIGHT, width, height) {
			return resizeMAX(MAX_WIDTH, MAX_HEIGHT, width, height);
		},
		
		imgResizeMIN : function(MIN_WIDTH, MIN_HEIGHT, width, height) {
			return resizeMIN(MIN_WIDTH, MIN_HEIGHT, width, height);
		},
		
		cutSquare : function(canvas, width, height) {
			width = 0 | width; height = 0 | height;
			length = width < height ? width : height; length -= 2;
			cutPosX = 0 | (( width - length ) / 2); cutPosY = 0 | (( height - length ) / 2);
			var newCanvas = document.createElement("canvas"); newCanvas.width = length; newCanvas.height = length;
			newCanvas.getContext("2d").drawImage(canvas, cutPosX, cutPosY, length, length, 0, 0, length, length);
			var strMime = "image/jpeg", strData = newCanvas.toDataURL(strMime);
			return strData;
		},
		
		thumbnail : function(image, object) {
			var thumWidth = object.width || 100, thumHeight = object.height || 100;
			if( thumWidth == thumHeight ) {
				var	thuW = null, thuH = null;
				if( image.width < image.height ) {
					thuW = thumWidth;
					var sizeArr = imageUtility.imgResizeMAX(thuW, thuH, image.width, image.height);
				} else {
					thuH = thumHeight;
					var sizeArr = imageUtility.imgResizeMAX(thuW, thuH, image.width, image.height);
				}
				var thumbCV = imageUtility.canvas2JPEG(image, sizeArr[0], 'canvas'),
					thumbDataUrl = imageUtility.cutSquare(thumbCV, sizeArr[1], sizeArr[2]),
					imgBlobObj = imageUtility.dataURL2Blob(thumbDataUrl, 'image/jpeg'); thumbDataUrl = undefined;
			} else {
				var sizeArr = imageUtility.imgResizeMAX(thumWidth, thumHeight, image.width, image.height),
					thumbDataUrl = imageUtility.canvas2JPEG(image, sizeArr[0], 'dataUrl'),
					imgBlobObj = imageUtility.dataURL2Blob(thumbDataUrl, 'image/jpeg'); thumbDataUrl = undefined;
			}
			return window.URL.createObjectURL(imgBlobObj);
		},
		
		canvas2JPEG : function(image, scale, mode) {
			var fineCanvas = fineScale(image, scale),
				strMime = "image/jpeg", strData = fineCanvas.toDataURL(strMime);
			if(strData.indexOf(strMime) != 5) return false;
			return mode == 'canvas' ? fineCanvas : strData;
		},
		
		dataURL2Blob : function(dataURL, dataTYPE) {
			var binary = atob(dataURL.split(',')[1]), array = [];
			for( var i=0; i<binary.length; i++ ) array.push(binary.charCodeAt(i));
			return new Blob([new Uint8Array(array)], {type: dataTYPE});
		},
		
		readProcess : function(e, file, object) {
			object = object || {};
			var imgObj = [], imgSize = object.imgSize || {
				'0': {'spec': 'SQR', 'W': 55, 'H': 55},
				'1': {'spec': 'SQR', 'W': 200, 'H': 200},
				'2': {'spec': 'MAX', 'W': 400, 'H': null},
				'3': {'spec': 'MAX', 'W': 700, 'H': 700},
				'4': {'spec': 'MAX', 'W': 1400, 'H': 1400}
			};
			
			var image = new Image(); image.src = e.target.result;
			image.onload = function() {
				var thumbnail = document.createElement("img"); thumbnail.src = imageUtility.thumbnail(image, object.thumbnail);
					object.thumbEvent(thumbnail); thumbnail = undefined;
				for( var i in imgSize ) {
					if( imgSize[i].spec == 'SQR' ) {
						var sqrW = null, sqrH = null;
						if( image.width < image.height )
							var sizeArr = imageUtility.imgResizeMAX(imgSize[i].W+2, sqrH, image.width, image.height);
						else
							var sizeArr = imageUtility.imgResizeMAX(sqrW, imgSize[i].H+2, image.width, image.height);
						var newCanvas = imageUtility.canvas2JPEG(image, sizeArr[0], 'canvas');
						var strData = imageUtility.cutSquare(newCanvas, sizeArr[1], sizeArr[2]);
					} else {
						if( imgSize[i].spec == 'MAX' )
							var sizeArr = imageUtility.imgResizeMAX(imgSize[i].W, imgSize[i].H, image.width, image.height);
						else
							var sizeArr = imageUtility.imgResizeMIN(imgSize[i].W, imgSize[i].H, image.width, image.height);
						var strData = imageUtility.canvas2JPEG(image, sizeArr[0], 'dataUrl');
					}
					//object of image upload
					imgObj[i] = [];
					imgObj[i][0] = strData; imgObj[i][1] = file.name; strData = undefined;
					imgObj[i][2] = imgSize[i].spec == 'SQR' ? imgSize[i].W : 0 | sizeArr[1];
					imgObj[i][3] = imgSize[i].spec == 'SQR' ? imgSize[i].H : 0 | sizeArr[2];
				}
				html5.ajaxTxing(imgObj, file);
			}
		}
	};
})();

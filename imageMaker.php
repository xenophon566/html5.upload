<?php
/**
* My Upload Plugin - Image Utility Tool
* 
* @Date 	20140205
* @Author 	ShawnWu
* @Version 	release v3.0.20140227
* @License 	under the MIT License
**/
if($_POST) for( $i=0; $i<count($_POST['ajaxData']); $i++ )
	dataUrltoImage($_POST['ajaxData'][$i][0], $_POST['ajaxData'][$i][1], $_POST['ajaxData'][$i][2], $_POST['ajaxData'][$i][3]);

//make real image
function dataUrltoImage($dataUrl, $name, $width, $height, $imgId='') {
	preg_match('/data:([^;]*);base64,(.*)/', $dataUrl, $match);
	$image_type = explode("/", $match[1]);
	$image_name = "upload_image/". $name."_".$width."_".$height . $imgId. "." . $image_type[1];
	$image_content = base64_decode($match[2]);
	$file = fopen($image_name, "wb");
	fwrite($file, $image_content);
	fclose($file);
}
?>

<?php

if (! defined('FW')) { die('Forbidden'); }

if (is_admin()) {
	$eds = fw_ext('editor-shortcodes-v2');

	wp_enqueue_style( 'fw-ext-editor-shortcodes-v2-css',
		$eds->locate_css_URI('styles'),
		array(),
		fw()->manifest->get_version()
	);

	wp_localize_script(
		'fw',
		'fw_ext_editor_shortcodes_v2_data',
		array(
			'button_title' => __('Editor Shortcodes'),
			'default_shortcodes_list' => $eds->default_shortcodes_list(),
			'shortcodes' => $eds->build_shortcodes_list()
		)
	);

}

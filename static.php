<?php

if (! defined('FW')) { die('Forbidden'); }

if (is_admin()) {
	$eds = fw_ext('wp-shortcodes');

	wp_enqueue_style( 'fw-ext-wp-shortcodes-css',
		$eds->locate_css_URI('styles'),
		array(),
		fw()->manifest->get_version()
	);

	wp_localize_script(
		'fw',
		'fw_ext_wp_shortcodes_localizations',
		array(
			'button_title' => __('Unyson Shortcodes'),
			'default_shortcodes_list' => $eds->default_shortcodes_list(),
		)
	);
}

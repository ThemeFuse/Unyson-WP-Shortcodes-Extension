<?php

if (! defined('FW')) { die('Forbidden'); }

$manifest = array(
	'name' => __('WordPress Shortcodes', 'fw'),
	'description' => __(
		'Lets you insert Unyson shortcodes inside any WordPress editor.',
		'fw'
	),
	'version' => '1.0.0',
	'display' => true,
	'standalone' => true,

	'requirements' => array(
		'extensions' => array(
			'shortcodes' => array(
				'min_version' => '1.3.17'
			)
		)
	)
);

$manifest['github_update'] = 'ThemeFuse/Unyson-WP-Shortcodes-Extension';


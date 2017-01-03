<?php

if (! defined('FW')) { die('Forbidden'); }

$manifest = array(
	'name' => __('WordPress Shortcodes', 'fw'),
	'description' => __(
		'Lets you insert Unyson shortcodes inside any WordPress editor.',
		'fw'
	),
	'uri' => 'http://manual.unyson.io/en/latest/extension/wp-shortcodes/index.html',
	'github_repo' => 'https://github.com/ThemeFuse/Unyson-WP-Shortcodes-Extension',
	'version' => '1.0.7',
	'display' => true,
	'standalone' => true,
	
	'author' => 'ThemeFuse',
	'author_uri' => 'http://themefuse.com/',

	'requirements' => array(
		'extensions' => array(
			'shortcodes' => array(
				'min_version' => '1.3.17'
			)
		)
	)
);

$manifest['github_update'] = 'ThemeFuse/Unyson-WP-Shortcodes-Extension';


<?php

if (! defined('FW')) { die('Forbidden'); }

$manifest = array(
	'name' => __('WordPress Shortcodes', 'fw'),
	'description' => __(
		'Lets you insert Unyson shortcodes inside any WordPress editor.',
		'fw'
	),
	'version' => '0.0.9',
	'display' => true,
	'standalone' => true,

	'requirements' => array(
		'framework' => array(
			/**
			* In that version was solved the bug with children extension requirements when activate an extension
			*/
			'min_version' => '2.1.18',
		),

		'extensions' => array(
			'shortcodes' => array(
				'min_version' => '1.3.17'
			)
		)
	)
);


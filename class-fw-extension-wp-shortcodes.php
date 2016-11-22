<?php

if (! defined('FW')) { die('Forbidden'); }

class FW_Extension_WP_Shortcodes extends FW_Extension {
	protected $default_shortcodes_list = null;

	protected function _init() {
		if ( is_admin() ) {
			$this->add_admin_hooks();
		} else {
			$this->add_frontend_hooks();
		}
	}

	public function default_shortcodes_list() {
		if (! $this->default_shortcodes_list) {
			$shortcodes = fw_ext('shortcodes')->get_shortcodes();

			/**
			 * Filter default shortcodes list that will be displayed in
			 * default post editor and all of the wp-editors.
			 */
			$this->default_shortcodes_list = array_diff(apply_filters(
				'fw:ext:wp-shortcodes:default-shortcodes',
				array_diff(array_keys($shortcodes), array('column', 'section', 'row'))
			), array(
				'section', 'column', 'row'
			));
			
			sort( $this->default_shortcodes_list );

			$this->default_shortcodes_list = apply_filters(
				'fw:ext:wp-shortcodes:sort', $this->default_shortcodes_list
			);

		}

		return $this->default_shortcodes_list;
	}

	protected function add_admin_hooks() {
		add_filter(
			'mce_buttons',
			array($this, 'register_unyson_button')
		);

		add_filter(
			'mce_external_plugins',
			array($this, 'add_unyson_plugin')
		);

		add_filter(
			'mce_css',
			array($this, 'editor_styles')
		);

		add_action(
			'fw_admin_enqueue_scripts:post',
			array($this, 'enqueue_option_types_scripts')
		);
	}

	/**
	 * Enqueue option types statics.
	 */
	public function enqueue_option_types_scripts() {
		wp_enqueue_style('fw-unycon');

		if (function_exists('fw_ext_shortcodes_enqueue_shortcodes_admin_scripts')) {
			fw_ext_shortcodes_enqueue_shortcodes_admin_scripts();
		}
	}

	protected function add_frontend_hooks() {
		add_action(
			'fw_ext_shortcodes:after_shortcode_enqueue_static',
			array($this, 'enqueue_wp_shortcode_static')
		);
	}

	public function add_unyson_plugin($plugins) {
		$plugins['unyson_shortcodes'] = $this->locate_js_URI('plugin');
		return $plugins;
	}

	public function register_unyson_button($buttons) {
		array_push($buttons, 'unyson_shortcodes');
		return $buttons;
	}

	public function editor_styles($mce_css) {
		$mce_css .= ', ' . implode(', ', array(
			$this->locate_css_URI('content'),
			// in case some shortcodes use unycon icons
			fw_get_framework_directory_uri('/static/libs/unycon/unycon.css'),
			// in case some shortcodes use fontAwesome icons
			fw_get_framework_directory_uri('/static/libs/font-awesome/css/font-awesome.min.css')
		));

		return $mce_css;
	}

	public function enqueue_wp_shortcode_static($shortcode) {
		/**
		 * Try to enqueue static for shortcodes that may be in
		 * some attribute for a Page Builder Shortcode.
		 */
		if ($this->have_to_decode_with_aggresive($shortcode[3])) {
			$atts = shortcode_parse_atts($shortcode[3]);

			// 1. first decode with JSON coder
			$atts = fw_ext('shortcodes')->get_attr_coder('json')->decode(
				$atts, '', null
			);

			$this->enqueue_wp_shortcode_static_real($atts);
		}
	}

	public function enqueue_wp_shortcode_static_real($atts) {
		// 2. decode with aggressive, but only if we need it

		/**
		 * Skip whole recursive branch if it doesn't contain a shortocde.
		 * That's a TREMENDOUS performance optimisation.
		 */
		$have_to_recur = $this->have_to_decode_with_aggresive(
			json_encode($atts)
		);

		if (! $have_to_recur) { return; }

		foreach ($atts as $key => $value) {
			if (is_string($value)) {
				if (! $this->have_to_decode_with_aggresive($value)) {
					continue;
				}

				// 3. Enqueue
				fw_ext_shortcodes_enqueue_shortcodes_static(
					$value
				);
			} else if (is_array($value)) {
				$this->enqueue_wp_shortcode_static_real($value);
			}
		}
	}

	private function have_to_decode_with_aggresive($str) {
		if (! is_string($str)) { return false; }

		$has_coder_inside = strpos($str, '_fw_coder=') !== false;
		$has_aggessive_coder = strpos($str, 'aggressive') !== false;
		$has_wp_editor_shortcode = strpos(
			$str,
			'__fw_editor_shortcodes_id'
		) !== false;

		return $has_coder_inside && $has_aggessive_coder && $has_wp_editor_shortcode;
	}

}


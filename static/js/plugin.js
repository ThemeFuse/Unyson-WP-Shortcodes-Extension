(function ($) {
	tinymce.create('tinymce.plugins.unyson_shortcodes', {
		init: initPlugin
	});

	tinymce.PluginManager.add('unyson_shortcodes', tinymce.plugins['unyson_shortcodes']);

	////////////

	function initPlugin (editor) {
		var html = shortcodesHtmlFor(editor);

		/**
		 * Skip initialization if we don't have any HTML for this current editor
		 */
		if (! html) {
			return;
		}

		editor.addButton('unyson_shortcodes', {
			type: 'panelbutton',
			icon: 'fw-shortcodes-button',
			panel: {
				style: 'max-width: 450px;',
				role: 'application',
				classes: 'fw-shortcodes-container',
				autohide: true,
				html: html,
				onclick: function (e) {
					var tag;

					if ($(e.target).hasClass('fw-shortcode-item')) {
						tag = $(e.target).attr('data-shortcode-tag');
					} else if (editor.dom.getParent(e.target, '.fw-shortcode-item')) {
						tag = $(editor.dom.getParent(e.target, '.fw-shortcode-item')).attr('data-shortcode-tag');
					} else {
						return false;
					}

					if (tag) {
						tinyMCE.activeEditor.execCommand(
							"insertShortcode",
							false,
							{tag: tag}
						);
					}

					this.hide();
				}
			},
			onclick: fixPanelPosition,
			tooltip: fw_ext_wp_shortcodes_data.button_title
		});

		editor.addCommand('insertShortcode', function (ui, params) {
			insertShortcode(editor, params.tag);
		});

		//disable drag&drop in firefox
		editor.on('mousedown', function(e){
			if ( $(e.target).hasClass('unselectable') ) {
				e.stopPropagation();
				return false;
			}
		});

		//add listners for content item
		editor.on('click', function (e) {
			var currentElement = e.target;

			//delete item
			if ($(currentElement).hasClass('fw-item-delete')) {
				removeShortcodeFor(
					$(currentElement).closest('.fw-shortcode'),
					editor
				);

				editor.fire('change');

				return false;
			}

			//clone item
			if ($(currentElement).hasClass('fw-item-clone')) {
				duplicateShortcodeFor(
					$(currentElement).closest('[data-fw-shortcode-tag]'),
					editor
				);

				editor.fire('change');

				return false;
			}

			//default is edit item
			if ($(currentElement).hasClass('fw-shortcode')) {
				editShortcodeFor(
					$(currentElement),
					editor
				);

				editor.fire('change');
			} else if ($(currentElement).parents('[data-fw-shortcode-tag]').length) {
				editShortcodeFor(
					$(currentElement).closest('[data-fw-shortcode-tag]'),
					editor
				)

				editor.fire('change');
			}
		});

		var replaceTagsWithHtml = _.partial(performReplacement, replaceTagWithHtml);
		var replaceTagsWithHtmlAndInitialize = _.partial(
			performReplacement,
			_.compose(
				replaceTagWithHtml,
				initializeTag
			)
		);

		editor.on('BeforeSetContent', function (event) {
			/**
			 * That's actually happening just on the first page load.
			 *
			 * This function will initialze editor storage and also it should
			 * render first HTML.
			 */

			event.content = replaceTagsWithHtmlAndInitialize(event.content);
		});

		function replaceTagWithHtml (shortcode) {
			var data = dataFor(shortcode.tag);
			var values = fwShortcodesAggressiveCoder.decode(shortcode.attrs.named);
			var id = values.__fw_editor_shortcodes_id;

			if (! fwShortcodesAggressiveCoder.canDecode(shortcode.attrs.named)) {
				return false;
			}

			return getVisualElementHtml(data.tag, id);
		}

		function initializeTag (shortcode) {
			var data = dataFor(shortcode.tag);
			var values = fwShortcodesAggressiveCoder.decode(shortcode.attrs.named);
			var id = values.__fw_editor_shortcodes_id;

			if (! fwShortcodesAggressiveCoder.canDecode(shortcode.attrs.named)) {
				if (values.fw_shortcode_id) {
					return renderDeprecatedSyntax(shortcode.tag, values.fw_shortcode_id);
				}

				return shortcode;
			}

			initializeShortcodeStorage(editor, data.tag, id, values);

			return shortcode;
		}

		function renderDeprecatedSyntax (tag, fw_id) {
			var deprecatedData = JSON.parse(
				jQuery('#fw-shortcode-settings').val()
			);

			var id = fw.randomMD5();

			try {
				var values = deprecatedData[tag][fw_id];
			} catch(err) {
				/**
				 * Get actual defaults if there's no value in storage
				 */
				var values = null;
			}

			values.__fw_editor_shortcodes_id = id;

			/**
			 * Adhere to the convetion of coders.
			 * Very important.
			 */
			values._fw_coder = 'aggressive';

			initializeShortcodeStorage(editor, tag, id, values);

			return {
				tag: tag,
				attrs: {
					named: values
				}
			};
		}

		//replace all html content with tags
		editor.on('PostProcess', function (event) {
			if (event.get) {
				event.content = replaceHtmlWithTags(editor, event.content);
				// console.log(event.content);
			}
		});

		function performReplacement (callback, content) {
			return _.reduce(
				fw_ext_wp_shortcodes_data.shortcodes,
				function (currentContent, shortcode) {
					return wp.shortcode.replace(
						shortcode.tag,
						currentContent,
						callback
					);
				},
				content
			);
		}
	}

	function replaceHtmlWithTags (editor, content) {
		var $content = jQuery(
			'<div class="fw-replace-temporary-tag">' + content + '</div>'
		);

		if ($content.find('.fw-shortcode').length == 0) {
			return content;
		}

		_.map(
			$content.find('.fw-shortcode').toArray(),
			replaceShortcodeWithTag
		);

		function replaceShortcodeWithTag (shortcode) {
			var id = $(shortcode).attr('data-fw-shortcode-id');
			getStorageFor(editor);

			$(shortcode).parent().replaceWith(
				formShortcodeTagFor(id, editor)
			);
		}

		return $content.html();
	}

	function formShortcodeTagFor (id, editor) {
		var data = getStorageFor(editor).get(id);
		if (! data) return;
		var encoded = fwShortcodesAggressiveCoder.encode(data.modal.get('values'));
		encoded['__fw_editor_shortcodes_id'] = id;
		var encodedString = _.map(
			encoded,
			function (value, key) { return key + '="' + value + '"'; }
		).join(' ');

		return '[' + data.tag + ' ' + encodedString + ']' + '[/' + data.tag + ']';
	}

	function getVisualElementHtml (tag, id) {
		var shortcode = dataFor(tag);

		var icon = getShortcodeIcon(tag);

		icon = jQuery(
			'<div>' + icon + '</div>'
		);

		icon.children()
			.addClass('mceItem mceNonEditable unselectable')
			.attr('contenteditable', 'false')
			.filter('span,i,em').html('&nbsp;');
		icon = icon.html();

		return '' +
			'<p><span data-fw-shortcode-id="' + id + '" data-fw-shortcode-tag="' + tag + '" class="mceNonEditable mceItem fw-shortcode unselectable" contenteditable="false">' +
				'<span class="mceItem fw-component-bar mceNonEditable unselectable" contenteditable="false">' +
					icon +
					'<span class="mceItem mceNonEditable unselectable" contenteditable="false">' + shortcode.title + '</span>' +
					'<span class="fw-item-buttons mceItem fw-component-controls mceNonEditable unselectable">' +
						'<i class="mceItem mceNonEditable unselectable dashicons dashicons-admin-generic fw-item-edit">&nbsp;</i>' +
						'<i class="mceItem mceNonEditable unselectable dashicons dashicons-admin-page fw-item-clone">&nbsp;</i>' +
						'<i class="mceItem mceNonEditable unselectable dashicons dashicons-no fw-item-delete">&nbsp;</i>' +
					'</span>' +
					'<span class="mceItem mceNonEditable fw-component-title unselectable fw-hide" style="display: none">3Nd0fL1N3Sh0rtC0d3</span>' +
				'</span>' +
			'</span></p>';
	}

	function shortcodesHtmlFor (editor) {
		var shortcodes = shortcodesListFor(editor);

		if (! shortcodes) { return; }

		return _.map(
			shortcodes,
			_.compose(
				singleShortcodeHtml,
				dataFor
			)
		).join("\n");

		function singleShortcodeHtml (shortcode) {
			return '<div class="fw-shortcode-item" data-shortcode-tag="' + shortcode.tag + '">' +
						'<div class="inner">' +
							getShortcodeIcon(shortcode.tag) +
							'<p><span>' + shortcode.title + '</span></p>' +
						'</div>' +
					'</div>';
		}
	}

	function getShortcodeIcon (tag) {
		var iconHtml = null;
		var shortcode = dataFor(tag);

		if (shortcode.icon) {
			if (window.FwBuilderComponents) {
				if (typeof FwBuilderComponents.ItemView.iconToHtml !== "undefined") {
					iconHtml = FwBuilderComponents.ItemView.iconToHtml(shortcode.icon);
				}
			}

			if (! iconHtml) {
				iconHtml = '<img src="' + shortcode.icon + '"/>';
			}
		}

		return iconHtml || '';
	}

	function fixPanelPosition (e) {
		try {
			var id = e.control.panel._id,
				$panel = $('#' + id + '.mce-fw-shortcodes-container'),
				oldPos = $panel.data('left');
			if (typeof oldPos === 'undefined' ) {
				oldPos = parseInt($panel.css('left'));
				$panel.data('left', oldPos);
			}

			$panel.css('left',(oldPos - 216)+'px');
			$panel.css('height', '');
		} catch (e) {
			//sometime _id is undefined
			return false;
		}
	}

	/**
	 * Editor Shortcodes V2 extensions integrates well with wp-editor
	 * option type. The wp-editor itself is responsible for having an
	 * attr named data-fw-shortcodes-list. This attr should contain
	 * valid JSON and it should contain a list of shortcodes we should render.
	 */
	function shortcodesListFor (editor) {
		var $wpEditor = jQuery(editor.targetElm).closest(
			'.fw-option-type-wp-editor'
		);

		var isWpEditor = $wpEditor.length > 0;

		if (isWpEditor) {
			if ($wpEditor.attr('data-fw-shortcodes-list')) {
				return JSON.parse($wpEditor.attr('data-fw-shortcodes-list'));
			}

			return false;
		}

		return fw_ext_wp_shortcodes_data.default_shortcodes_list;
	}

	function dataFor (shortcode) {

		var toReturn = $.extend(
			true,
			{},
			{
				config: {
					page_builder: {
						popup_size: 'small'
					}
				}
			},
			_.findWhere(
				fw_ext_wp_shortcodes_data.shortcodes,
				{tag: shortcode}
			)
		);

		return toReturn;
	}

	function removeShortcodeFor ($container, editor) {
		var id = $container.attr('data-fw-shortcode-id');

		$container.remove();
		getStorageFor(editor).remove(id);
	}

	function editShortcodeFor ($container, editor) {
		var id = $container.attr('data-fw-shortcode-id');
		getStorageFor(editor).get(id).modal.open();
	}

	function duplicateShortcodeFor ($container, editor) {
		// TODO: change cursor position ??
		var tag = $container.attr('data-fw-shortcode-tag');
		var id = $container.attr('data-fw-shortcode-id');

		var newId = fw.randomMD5();
		var oldData = getStorageFor(editor).get(id)

		var modal = new fw.OptionsModal({
			options: oldData.modal.get('options'),
			size: oldData.modal.get('size'),
			values: oldData.modal.get('values')
		});

		modal.on('change:values', function () {
			editor.fire('change');
		})

		getStorageFor(editor).add(newId, {
			tag: oldData.tag,
			id: newId,
			modal: modal
		});

		insertShortcode(editor, tag, newId);
	}

	function insertShortcode (editor, tag, id) {
		var id = id || fw.randomMD5();

		var content = getVisualElementHtml(tag, id);
		editor.execCommand("mceInsertContent", false, content);

		initializeShortcodeStorage(editor, tag, id);
		editor.fire('change');
	}

	function initializeShortcodeStorage (editor, tag, id, values) {
		if (getStorageFor(editor).get(id)) { return; }

		var options = {
			options: dataFor(tag).options,
			size: dataFor(tag).config.page_builder.popup_size
		};

		if (! values) {
			options['values'] = dataFor(tag).default_values;
		}

		var modal = new fw.OptionsModal(options);

		modal.on('change:values', function () {
			editor.fire('change');
		});

		if (values) {
			modal.set('values', values);
		} else {
			modal.getActualValues().then(function (response) {
				modal.set('values', response.data.values);
			});
		}

		var shortcodeData = {
			tag: tag,
			modal: modal,
			id: id
		};

		getStorageFor(editor).add(id, shortcodeData);
	}

	function getStorageFor (editor) {
		window.fwEditorShortcodesStorage = window.fwEditorShortcodesStorage || {};

		return {
			add: add,
			remove: remove,
			get: get
		};

		function get(id) {
			return window.fwEditorShortcodesStorage[id];
		}

		function add (id, data) {
			window.fwEditorShortcodesStorage[id] = data;
		}

		function remove (id) {
			window.fwEditorShortcodesStorage = _.omit(
				window.fwEditorShortcodesStorage,
				id
			);
		}
	}

	function deepObjectExtend(target, source) {
		for (var prop in source)
			if (prop in target)
				deepObjectExtend(target[prop], source[prop]);
			else
				target[prop] = source[prop];

		return target;
	}
})(jQuery);


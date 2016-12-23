(function ($) {

	/**
	 * Init this plugin only in some cases.
	 *
	 * 1. There's a wp-editor with the below option on the page
	 *      'shortcodes' => true
	 *
	 * 2. There's any non wp-editor tinymce on this page (like main post editor)
	 */
	if (! shouldInitWpShortcodes()) { return; }

	fw.shortcodesLoadData().then(refreshEachEditor);

	tinymce.create('tinymce.plugins.unyson_shortcodes', {
		init: initPlugin
	});

	tinymce.PluginManager.add('unyson_shortcodes', tinymce.plugins['unyson_shortcodes']);

	////////////

	function initPlugin (editor) {
		if (! editorHasUnysonButton(editor)) {
			return;
		}

		editor.addButton('unyson_shortcodes', {
			icon: 'fw-shortcodes-button',
			onclick: function () {

				editor.windowManager.open({
					title: fw_ext_wp_shortcodes_localizations.button_title,
					classes: 'fw-shortcodes-window',
					autofix: false,
					body: [
						{
							type: 'textbox',
							name: 'textbox',
							label: false,
							tooltip: 'Some nice tooltip to use',
							value: 'default value',
							hidden: true
						},

						{
							type: 'container',
							name: 'container',
							label: false,
							html: shortcodesHtmlFor(editor)
						}
					],

					buttons: [],

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
							editor.execCommand(
								"insertShortcode",
								false,
								{tag: tag}
							);
						}

						this.close();
					}

				});

			},

			tooltip: fw_ext_wp_shortcodes_localizations.button_title
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
			var values = fw.shortcodesAggressiveCoder.decode(shortcode.attrs.named);
			var id = values.__fw_editor_shortcodes_id;

			if (! fw.shortcodesAggressiveCoder.canDecode(shortcode.attrs.named)) {
				return false;
			}

			return getVisualElementHtml(data.tag, id);
		}

		function initializeTag (shortcode) {
			var data = dataFor(shortcode.tag);
			var values = fw.shortcodesAggressiveCoder.decode(shortcode.attrs.named);
			var id = values.__fw_editor_shortcodes_id;

			if (! fw.shortcodesAggressiveCoder.canDecode(shortcode.attrs.named)) {
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
				var values = _.findWhere(_.values(fw.unysonShortcodesData()), {tag: tag}).default_values;
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
			}
		});

		function performReplacement (callback, content) {
			if (! fw.unysonShortcodesData()) { return content; }

			return _.reduce(
				_.values(fw.unysonShortcodesData()),
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

	function editorContainsUnysonShortcodes (editor) {
		/**
		 * Prevent error:
		 * Cannot read property 'body' of undefined
		 */
		if (! editor.getDoc()) { return false; }

		var content = editor.getContent();

		var hasNewSyntax = content.indexOf('__fw_editor_shortcodes_id') !== -1;
		var hasDeprecatedSyntax = content.indexOf('fw_shortcode_id') !== -1;

		return hasNewSyntax || hasDeprecatedSyntax;
	}

	function shouldInitWpShortcodes () {
		return _.some(
			tinymce.get(),
			editorHasUnysonButton
		);
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

		var encoded = fw.shortcodesAggressiveCoder.encode(data.modal.get('values'));
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

		return '<div class="fw-wp-shortcodes-item-wrapper">' + _.map(
			shortcodes,
			_.compose(
				singleShortcodeHtml,
				dataFor
			)
		).join("\n") + '</div>';

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

		var src = shortcode.icon || shortcode.image;

		if (src) {
			if (window.FwBuilderComponents) {
				if (typeof FwBuilderComponents.ItemView.iconToHtml !== "undefined") {
					iconHtml = FwBuilderComponents.ItemView.iconToHtml(src);
				}
			}

			if (! iconHtml) {
				iconHtml = '<img src="' + src + '"/>';
			}
		}

		return iconHtml || '';
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

		return fw_ext_wp_shortcodes_localizations.default_shortcodes_list;
	}

	function editorHasUnysonButton (editor) {
		var $wpEditor = jQuery(editor.targetElm).closest(
			'.fw-option-type-wp-editor'
		);

		var isWpEditor = $wpEditor.length > 0;

		if (isWpEditor) {
			if ($wpEditor.attr('data-fw-shortcodes-list')) {
				return true;
			}

			return false;
		}

		/**
		 * Any editor that is not an `wp-editor` option_type
		 * is an editor that has Unyson Button by default, which may not be
		 * the right way to go.
		 */
		return true;
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
				_.values(fw.unysonShortcodesData()),
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

		var modal = createModal({
			options: oldData.modal.get('options'),
			size: oldData.modal.get('size'),
			values: oldData.modal.get('values')
		}, oldData);

		modal.on('change:values', function () {
			editor.save();
			editor.fire('change');
		});

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

		var node, p;

		if (node = editor.dom.getParent(editor.selection.getNode())) {
			p = editor.dom.create('p');
			editor.dom.insertAfter(p, node);
			editor.selection.setCursorLocation(p, 0);
			editor.nodeChanged();
		}

		editor.execCommand("mceInsertContent", false, content);

		initializeShortcodeStorage(editor, tag, id);
		editor.fire('change');
	}

	function initializeShortcodeStorage (editor, tag, id, values) {
		if (getStorageFor(editor).get(id)) { return; }

		var options = {
			options: dataFor(tag).options,
			size: dataFor(tag).popup_size
		};

		if (! values) {
			options['values'] = dataFor(tag).default_values;
		}

		var modal = createModal(options, dataFor(tag));

		modal.on('change:values', function () {
			editor.save();
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

	function createModal (options, shortcodeData) {
		var eventData = {modalSettings: {buttons: []}};

		fwEvents.trigger('fw:ext:wp-shortcodes:options-modal:settings', {
			modal: null,
			modalSettings: eventData.modalSettings,
			shortcode: shortcodeData.tag,
			wp_shortcodes: true
		});

		var modal = new fw.OptionsModal(options, eventData.modalSettings);

		modal.on('open', function () {
			triggerEvent('options-modal:open', modal, shortcodeData);
		});

		modal.on('render', function () {
			triggerEvent('options-modal:render', modal, shortcodeData);
		});

		modal.on('close', function () {
			triggerEvent('options-modal:close', modal, shortcodeData);
		});

		return modal;
	}

	function triggerEvent (name, modal, shortcodeData) {
		fwEvents.trigger('fw:ext:wp-shortcodes:' + name, {
			modal: modal,
			shortcode: shortcodeData.tag,
			/**
			 * Act like Page Builder Simple Item, at least for now.
			 * TODO: Refactor this in the future
			 */
			item: {
				modal: modal,
				type: 'simple',
				shortcode: shortcodeData.tag,
				options: shortcodeData.options,
				values: modal.get('values')
			},
			wp_shortcodes: true
		});
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

	function refreshEachEditor () {

		tinymce.get().map(function (editor) {
			// re-render editor visual elements only if current
			// editor has an unyson shortcode in it
			//
			// there's no need to do this manipulation if editor has nothing
			// to do with Unyson Shortcodes
			if (editorContainsUnysonShortcodes(editor)) {

				if (! editor.isHidden()) {
					editor.hide(); editor.show();
				}

			}
		});

	}
})(jQuery);


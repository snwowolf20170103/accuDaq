/**
 * Block Factory Configuration
 * Extracted static configurations for Blockly Block Factory
 * Original Google Blockly Block Factory reference: https://github.com/google/blockly/tree/master/demos/blockfactory
 */

import * as Blockly from 'blockly';

// Type definition for factory base block with updateShape_ method
export interface FactoryBaseBlock extends Blockly.Block {
    updateShape_(option: string): void;
}

/**
 * Block Factory Toolbox Configuration
 * Defines the available block categories and blocks for the factory workspace
 */
export const factoryToolbox = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: 'Input',
            colour: 210,
            contents: [
                { kind: 'block', type: 'input_value' },
                { kind: 'block', type: 'input_statement' },
                { kind: 'block', type: 'input_dummy' },
            ]
        },
        {
            kind: 'category',
            name: 'Field',
            colour: 160,
            contents: [
                { kind: 'block', type: 'field_static' },
                { kind: 'block', type: 'field_input' },
                { kind: 'block', type: 'field_number' },
                { kind: 'block', type: 'field_angle' },
                { kind: 'block', type: 'field_dropdown' },
                { kind: 'block', type: 'field_checkbox' },
                { kind: 'block', type: 'field_colour' },
                { kind: 'block', type: 'field_variable' },
                { kind: 'block', type: 'field_image' },
            ]
        },
        {
            kind: 'category',
            name: 'Type',
            colour: 230,
            contents: [
                { kind: 'block', type: 'type_null' },
                { kind: 'block', type: 'type_boolean' },
                { kind: 'block', type: 'type_number' },
                { kind: 'block', type: 'type_string' },
                { kind: 'block', type: 'type_list' },
                { kind: 'block', type: 'type_other' },
            ]
        },
        {
            kind: 'category',
            name: 'Colour',
            colour: 20,
            contents: [
                { kind: 'block', type: 'colour_hue' },
            ]
        },
    ]
};

/**
 * Define all Block Factory blocks
 * This function registers custom blocks with Blockly for the block factory
 */
export const defineFactoryBlocks = () => {
    // ========== Root block: factory_base ==========
    Blockly.Blocks['factory_base'] = {
        init: function (this: Blockly.Block) {
            this.setColour(120);
            this.appendDummyInput()
                .appendField('name')
                .appendField(new Blockly.FieldTextInput('block_type'), 'NAME');
            this.appendStatementInput('INPUTS')
                .setCheck('Input')
                .appendField('inputs');

            const inlineDropdown = new Blockly.FieldDropdown([
                ['automatic inputs', 'AUTO'],
                ['external inputs', 'EXT'],
                ['inline inputs', 'INT']
            ]);
            this.appendDummyInput()
                .appendField(inlineDropdown, 'INLINE');

            const connectionsDropdown = new Blockly.FieldDropdown([
                ['no connections', 'NONE'],
                ['← left output', 'LEFT'],
                ['↕ top+bottom connections', 'BOTH'],
                ['↑ top connection', 'TOP'],
                ['↓ bottom connection', 'BOTTOM']
            ], function (this: Blockly.FieldDropdown, option: string) {
                const block = this.getSourceBlock();
                if (block) {
                    (block as FactoryBaseBlock).updateShape_(option);
                }
                return option;
            });
            this.appendDummyInput()
                .appendField(connectionsDropdown, 'CONNECTIONS');

            this.appendValueInput('TOOLTIP')
                .setCheck('String')
                .appendField('tooltip');
            this.appendValueInput('HELPURL')
                .setCheck('String')
                .appendField('help url');
            this.appendValueInput('COLOUR')
                .setCheck('Colour')
                .appendField('colour');

            this.setTooltip('Build a custom block by plugging\nfields, inputs and other blocks here.');
            this.setHelpUrl('https://developers.google.com/blockly/guides/create-custom-blocks/block-factory');
            this.setDeletable(false);
        },

        mutationToDom: function (this: Blockly.Block) {
            const container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('connections', this.getFieldValue('CONNECTIONS'));
            return container;
        },

        domToMutation: function (this: FactoryBaseBlock, xmlElement: Element) {
            const connections = xmlElement.getAttribute('connections') || 'NONE';
            this.updateShape_(connections);
        },

        updateShape_: function (this: FactoryBaseBlock, option: string) {
            const outputExists = this.getInput('OUTPUTTYPE');
            const topExists = this.getInput('TOPTYPE');
            const bottomExists = this.getInput('BOTTOMTYPE');

            if (option === 'LEFT') {
                if (!outputExists) {
                    this.appendValueInput('OUTPUTTYPE')
                        .setCheck('Type')
                        .appendField('output type');
                    this.moveInputBefore('OUTPUTTYPE', 'COLOUR');
                }
            } else if (outputExists) {
                this.removeInput('OUTPUTTYPE');
            }

            if (option === 'TOP' || option === 'BOTH') {
                if (!topExists) {
                    this.appendValueInput('TOPTYPE')
                        .setCheck('Type')
                        .appendField('top type');
                    this.moveInputBefore('TOPTYPE', 'COLOUR');
                }
            } else if (topExists) {
                this.removeInput('TOPTYPE');
            }

            if (option === 'BOTTOM' || option === 'BOTH') {
                if (!bottomExists) {
                    this.appendValueInput('BOTTOMTYPE')
                        .setCheck('Type')
                        .appendField('bottom type');
                    this.moveInputBefore('BOTTOMTYPE', 'COLOUR');
                }
            } else if (bottomExists) {
                this.removeInput('BOTTOMTYPE');
            }
        }
    };

    // ========== Input blocks ==========

    // Value input
    Blockly.Blocks['input_value'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('value input')
                .appendField(new Blockly.FieldTextInput('NAME'), 'INPUTNAME');
            this.appendStatementInput('FIELDS')
                .setCheck('Field')
                .appendField('fields');
            this.appendValueInput('TYPE')
                .setCheck('Type')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('type');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(210);
            this.setTooltip('A value input for a block.');
        }
    };

    // Statement input
    Blockly.Blocks['input_statement'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('statement input')
                .appendField(new Blockly.FieldTextInput('NAME'), 'INPUTNAME');
            this.appendStatementInput('FIELDS')
                .setCheck('Field')
                .appendField('fields');
            this.appendValueInput('TYPE')
                .setCheck('Type')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('type');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(210);
            this.setTooltip('A statement input for a block.');
        }
    };

    // Dummy input
    Blockly.Blocks['input_dummy'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('dummy input');
            this.appendStatementInput('FIELDS')
                .setCheck('Field')
                .appendField('fields');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(210);
            this.setTooltip('A dummy input for adding fields.');
        }
    };

    // ========== Field blocks ==========

    // Static text field
    Blockly.Blocks['field_static'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('text')
                .appendField(new Blockly.FieldTextInput(''), 'TEXT');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('Static text that is displayed on the block.');
        }
    };

    // Text input field
    Blockly.Blocks['field_input'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('text input')
                .appendField(new Blockly.FieldTextInput('default'), 'TEXT')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('An input field for text.');
        }
    };

    // Number input field
    Blockly.Blocks['field_number'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('numeric input')
                .appendField(new Blockly.FieldNumber(0), 'VALUE')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('An input field for numbers.');
        }
    };

    // Angle input field
    Blockly.Blocks['field_angle'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('angle input')
                .appendField(new Blockly.FieldNumber(90, 0, 360), 'ANGLE')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('An input field for angles (0-360).');
        }
    };

    // Dropdown field
    Blockly.Blocks['field_dropdown'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('dropdown')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.appendDummyInput()
                .appendField('options:')
                .appendField(new Blockly.FieldTextInput('Option1,Option2,Option3'), 'OPTIONS');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('A dropdown field with comma-separated options.');
        }
    };

    // Checkbox field
    Blockly.Blocks['field_checkbox'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('checkbox')
                .appendField(new Blockly.FieldCheckbox('TRUE'), 'CHECKED')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('A checkbox field.');
        }
    };

    // Colour picker field (using dropdown since FieldColour requires @blockly/field-colour)
    Blockly.Blocks['field_colour'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('colour')
                .appendField(new Blockly.FieldDropdown([
                    ['red', '#ff0000'],
                    ['green', '#00ff00'],
                    ['blue', '#0000ff'],
                    ['yellow', '#ffff00'],
                    ['orange', '#ffa500'],
                    ['purple', '#800080'],
                    ['cyan', '#00ffff'],
                    ['white', '#ffffff'],
                    ['black', '#000000']
                ]), 'COLOUR')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('A colour picker field.');
        }
    };

    // Variable field
    Blockly.Blocks['field_variable'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('variable')
                .appendField(new Blockly.FieldTextInput('item'), 'TEXT')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('A variable field.');
        }
    };

    // Image field
    Blockly.Blocks['field_image'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('image')
                .appendField(new Blockly.FieldTextInput('https://www.gstatic.com/codesite/ph/images/star_on.gif'), 'SRC')
                .appendField('width')
                .appendField(new Blockly.FieldNumber(15, 0), 'WIDTH')
                .appendField('height')
                .appendField(new Blockly.FieldNumber(15, 0), 'HEIGHT')
                .appendField('alt')
                .appendField(new Blockly.FieldTextInput('*'), 'ALT');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('An image field.');
        }
    };

    // ========== Type blocks ==========

    Blockly.Blocks['type_null'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('any');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Any type is allowed.');
        }
    };

    Blockly.Blocks['type_boolean'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Boolean');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Boolean (true/false) type.');
        }
    };

    Blockly.Blocks['type_number'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Number');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Number type.');
        }
    };

    Blockly.Blocks['type_string'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('String');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('String (text) type.');
        }
    };

    Blockly.Blocks['type_list'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Array');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('List/array type.');
        }
    };

    Blockly.Blocks['type_other'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('other type')
                .appendField(new Blockly.FieldTextInput('TYPE'), 'TYPE');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Custom type name.');
        }
    };

    // ========== Colour block ==========

    // Hue angle (using number input 0-360 instead of FieldAngle)
    Blockly.Blocks['colour_hue'] = {
        init: function (this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('hue:')
                .appendField(new Blockly.FieldNumber(230, 0, 360, 1), 'HUE');
            this.setOutput(true, 'Colour');
            this.setColour(230);
            this.setTooltip('Paint the block with this colour (0-360 hue).');
        },
        mutationToDom: function (this: Blockly.Block) {
            const container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('colour', String(this.getColour()));
            return container;
        },
        domToMutation: function (this: Blockly.Block, container: Element) {
            const colour = container.getAttribute('colour');
            if (colour) {
                this.setColour(colour);
            }
        }
    };
};

// Initialization state tracking
let factoryBlocksInitialized = false;

/**
 * Initialize factory blocks (call once before using)
 */
export const initFactoryBlocks = () => {
    if (factoryBlocksInitialized) return;
    defineFactoryBlocks();
    factoryBlocksInitialized = true;
};

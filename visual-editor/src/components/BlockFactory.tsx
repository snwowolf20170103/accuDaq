/**
 * Block Factory 组件
 * 基于 Blockly 官方 Block Factory 实现，允许用户可视化设计自定义积木
 * 参考: https://github.com/google/blockly/tree/master/demos/blockfactory
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import './BlockFactory.css';

// ============================================================================
// Block Factory 积木定义 - 与官方 Block Factory 保持一致
// ============================================================================

const defineFactoryBlocks = () => {
    // ========== 根积木: factory_base ==========
    Blockly.Blocks['factory_base'] = {
        init: function(this: Blockly.Block) {
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
            ], function(this: Blockly.FieldDropdown, option: string) {
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
        
        mutationToDom: function(this: Blockly.Block) {
            const container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('connections', this.getFieldValue('CONNECTIONS'));
            return container;
        },
        
        domToMutation: function(this: FactoryBaseBlock, xmlElement: Element) {
            const connections = xmlElement.getAttribute('connections') || 'NONE';
            this.updateShape_(connections);
        },
        
        updateShape_: function(this: FactoryBaseBlock, option: string) {
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

    // ========== 输入积木 ==========
    
    // 值输入
    Blockly.Blocks['input_value'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('value input')
                .appendField(new Blockly.FieldTextInput('NAME'), 'INPUTNAME');
            this.appendDummyInput()
                .appendField('fields')
                .appendField(new Blockly.FieldDropdown([
                    ['left', 'LEFT'],
                    ['right', 'RIGHT'],
                    ['centre', 'CENTRE']
                ]), 'ALIGN');
            this.appendStatementInput('FIELDS')
                .setCheck('Field');
            this.appendValueInput('TYPE')
                .setCheck('Type')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('type');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(210);
            this.setTooltip('A value socket for horizontal connections.');
        }
    };

    // 语句输入
    Blockly.Blocks['input_statement'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('statement input')
                .appendField(new Blockly.FieldTextInput('NAME'), 'INPUTNAME');
            this.appendDummyInput()
                .appendField('fields')
                .appendField(new Blockly.FieldDropdown([
                    ['left', 'LEFT'],
                    ['right', 'RIGHT'],
                    ['centre', 'CENTRE']
                ]), 'ALIGN');
            this.appendStatementInput('FIELDS')
                .setCheck('Field');
            this.appendValueInput('TYPE')
                .setCheck('Type')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('type');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(210);
            this.setTooltip('A statement socket for enclosed vertical stacks.');
        }
    };

    // 空输入
    Blockly.Blocks['input_dummy'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('dummy input');
            this.appendDummyInput()
                .appendField('fields')
                .appendField(new Blockly.FieldDropdown([
                    ['left', 'LEFT'],
                    ['right', 'RIGHT'],
                    ['centre', 'CENTRE']
                ]), 'ALIGN');
            this.appendStatementInput('FIELDS')
                .setCheck('Field');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(210);
            this.setTooltip('For adding fields without any block connections.');
        }
    };

    // ========== 字段积木 ==========

    // 静态文本
    Blockly.Blocks['field_static'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('text')
                .appendField(new Blockly.FieldTextInput(''), 'TEXT');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('Static text that serves as a label.');
        }
    };

    // 文本输入
    Blockly.Blocks['field_input'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('text input')
                .appendField(new Blockly.FieldTextInput('default'), 'TEXT')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('An input field for the user to enter text.');
        }
    };

    // 数字输入
    Blockly.Blocks['field_number'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('numeric input')
                .appendField(new Blockly.FieldNumber(0), 'VALUE')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.appendDummyInput()
                .appendField('min')
                .appendField(new Blockly.FieldNumber(-Infinity), 'MIN')
                .appendField('max')
                .appendField(new Blockly.FieldNumber(Infinity), 'MAX')
                .appendField('precision')
                .appendField(new Blockly.FieldNumber(0, 0), 'PRECISION');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('An input field for the user to enter a number.');
        }
    };

    // 角度输入
    Blockly.Blocks['field_angle'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('angle input')
                .appendField(new Blockly.FieldNumber(90, 0, 360), 'ANGLE')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('An input field for the user to enter an angle.');
        }
    };

    // 下拉菜单
    Blockly.Blocks['field_dropdown'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('dropdown')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.appendDummyInput()
                .appendField('•')
                .appendField(new Blockly.FieldTextInput('option'), 'USER0')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('OPTIONNAME'), 'CPU0');
            this.appendDummyInput()
                .appendField('•')
                .appendField(new Blockly.FieldTextInput('option'), 'USER1')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('OPTIONNAME'), 'CPU1');
            this.appendDummyInput()
                .appendField('•')
                .appendField(new Blockly.FieldTextInput('option'), 'USER2')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('OPTIONNAME'), 'CPU2');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('Dropdown menu with a list of options.');
        }
    };

    // 复选框
    Blockly.Blocks['field_checkbox'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('checkbox')
                .appendField(new Blockly.FieldCheckbox('TRUE'), 'CHECKED')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('Checkbox field.');
        }
    };

    // 颜色选择器
    Blockly.Blocks['field_colour'] = {
        init: function(this: Blockly.Block) {
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
            this.setTooltip('Colour input field.');
        }
    };

    // 变量
    Blockly.Blocks['field_variable'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('variable')
                .appendField(new Blockly.FieldTextInput('item'), 'TEXT')
                .appendField(',')
                .appendField(new Blockly.FieldTextInput('NAME'), 'FIELDNAME');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('Dropdown menu for variable names.');
        }
    };

    // 图片
    Blockly.Blocks['field_image'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('image')
                .appendField(new Blockly.FieldTextInput('https://www.gstatic.com/codesite/ph/images/star_on.gif'), 'SRC');
            this.appendDummyInput()
                .appendField('width')
                .appendField(new Blockly.FieldNumber(15, 0), 'WIDTH')
                .appendField('height')
                .appendField(new Blockly.FieldNumber(15, 0), 'HEIGHT')
                .appendField('alt text')
                .appendField(new Blockly.FieldTextInput('*'), 'ALT');
            this.setPreviousStatement(true, 'Field');
            this.setNextStatement(true, 'Field');
            this.setColour(160);
            this.setTooltip('Static image (JPEG, PNG, GIF, SVG, BMP).');
        }
    };

    // ========== 类型积木 ==========

    // 任意类型
    Blockly.Blocks['type_null'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('any');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Any type is allowed.');
        }
    };

    // 布尔类型
    Blockly.Blocks['type_boolean'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Boolean');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Booleans (true/false) are allowed.');
        }
    };

    // 数字类型
    Blockly.Blocks['type_number'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Number');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Numbers (int/float) are allowed.');
        }
    };

    // 字符串类型
    Blockly.Blocks['type_string'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('String');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Strings (text) are allowed.');
        }
    };

    // 数组类型
    Blockly.Blocks['type_list'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Array');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Arrays (lists) are allowed.');
        }
    };

    // 其他类型
    Blockly.Blocks['type_other'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('other')
                .appendField(new Blockly.FieldTextInput(''), 'TYPE');
            this.setOutput(true, 'Type');
            this.setColour(230);
            this.setTooltip('Custom type to allow.');
        }
    };

    // ========== 颜色积木 ==========

    // 色相角度 (使用数字输入 0-360 代替 FieldAngle)
    Blockly.Blocks['colour_hue'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('hue:')
                .appendField(new Blockly.FieldNumber(230, 0, 360, 1), 'HUE');
            this.setOutput(true, 'Colour');
            this.setColour(230);
            this.setTooltip('Paint the block with this colour (0-360 hue).');
        },
        mutationToDom: function(this: Blockly.Block) {
            const container = Blockly.utils.xml.createElement('mutation');
            container.setAttribute('colour', String(this.getColour()));
            return container;
        },
        domToMutation: function(this: Blockly.Block, container: Element) {
            const colour = container.getAttribute('colour');
            if (colour) {
                this.setColour(colour);
            }
        }
    };
};

// 类型定义
interface FactoryBaseBlock extends Blockly.Block {
    updateShape_(option: string): void;
}

// Block Factory 工具箱配置 - 与官方 Block Factory 一致
const factoryToolbox = {
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

// 初始化 Factory 积木
let factoryBlocksInitialized = false;
const initFactoryBlocks = () => {
    if (factoryBlocksInitialized) return;
    defineFactoryBlocks();
    factoryBlocksInitialized = true;
};

interface BlockFactoryProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveBlock: (blockDef: string, generatorCode: string, blockName: string) => void;
}

const BlockFactory = ({ isOpen, onClose, onSaveBlock }: BlockFactoryProps) => {
    const factoryDiv = useRef<HTMLDivElement>(null);
    const previewDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const previewWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    
    const [blockDefinition, setBlockDefinition] = useState('');
    const [generatorCode, setGeneratorCode] = useState('');
    const [codeHeaders, setCodeHeaders] = useState('');
    const [activeTab, setActiveTab] = useState<'headers' | 'definition' | 'generator'>('definition');
    const [format, setFormat] = useState<'JSON' | 'JavaScript'>('JavaScript');
    const [importFormat, setImportFormat] = useState<'script' | 'import'>('import');
    const [generatorLanguage, setGeneratorLanguage] = useState<'Python' | 'JavaScript' | 'C/C++'>('Python');
    const [savedBlocks, setSavedBlocks] = useState<{name: string, xml: string}[]>([]);
    const [showLibrary, setShowLibrary] = useState(false);

    // Block Library 本地存储 key
    const STORAGE_KEY = 'blockFactory_savedBlocks';

    // 生成 Code Headers
    const generateCodeHeaders = useCallback((): string => {
        const headers: string[] = [];
        
        if (importFormat === 'import') {
            headers.push("// Code Headers - Import format");
            headers.push("import * as Blockly from 'blockly';");
            
            switch (generatorLanguage) {
                case 'Python':
                    headers.push("import {pythonGenerator} from 'blockly/python';");
                    break;
                case 'JavaScript':
                    headers.push("import {javascriptGenerator, Order} from 'blockly/javascript';");
                    break;
                case 'C/C++':
                    headers.push("// C/C++ generator needs to be created manually");
                    headers.push("// import {cppGenerator} from './your-cpp-generator';");
                    break;
            }
        } else {
            headers.push("// Code Headers - Script tag format");
            headers.push("// Add these script tags to your HTML:");
            headers.push('// <script src="https://unpkg.com/blockly"></script>');
            
            switch (generatorLanguage) {
                case 'Python':
                    headers.push('// <script src="https://unpkg.com/blockly/python_compressed"></script>');
                    break;
                case 'JavaScript':
                    headers.push('// <script src="https://unpkg.com/blockly/javascript_compressed"></script>');
                    break;
                case 'C/C++':
                    headers.push("// C/C++ generator needs custom implementation");
                    break;
            }
            headers.push("");
            headers.push("// Then access via global Blockly object:");
            headers.push("// const Blockly = window.Blockly;");
        }
        
        return headers.join('\n');
    }, [importFormat, generatorLanguage]);

    // 获取根积木
    const getRootBlock = useCallback((workspace: Blockly.WorkspaceSvg): Blockly.Block | null => {
        const blocks = workspace.getTopBlocks(false);
        for (const block of blocks) {
            if (block.type === 'factory_base') {
                return block;
            }
        }
        return null;
    }, []);

    // 获取类型检查字符串
    const getOptTypesFrom = useCallback((block: Blockly.Block, inputName: string): string | null => {
        const typeBlock = block.getInputTargetBlock(inputName);
        if (!typeBlock) return null;
        
        const type = typeBlock.type;
        if (type === 'type_null') return null;
        if (type === 'type_boolean') return "'Boolean'";
        if (type === 'type_number') return "'Number'";
        if (type === 'type_string') return "'String'";
        if (type === 'type_list') return "'Array'";
        if (type === 'type_other') {
            const customType = typeBlock.getFieldValue('TYPE');
            return customType ? `'${customType}'` : null;
        }
        return null;
    }, []);

    // 生成字段代码 (JavaScript 格式)
    const getFieldsJs = useCallback((block: Blockly.Block | null): string[] => {
        const fields: string[] = [];
        while (block) {
            const type = block.type;
            
            if (type === 'field_static') {
                const text = block.getFieldValue('TEXT') || '';
                fields.push(JSON.stringify(text));
            } else if (type === 'field_input') {
                const text = block.getFieldValue('TEXT') || 'default';
                const fieldName = block.getFieldValue('FIELDNAME') || 'NAME';
                fields.push(`new Blockly.FieldTextInput(${JSON.stringify(text)}), ${JSON.stringify(fieldName)}`);
            } else if (type === 'field_number') {
                const value = Number(block.getFieldValue('VALUE')) || 0;
                const fieldName = block.getFieldValue('FIELDNAME') || 'NAME';
                const min = Number(block.getFieldValue('MIN'));
                const max = Number(block.getFieldValue('MAX'));
                const precision = Number(block.getFieldValue('PRECISION')) || 0;
                
                const args = [value];
                if (min !== -Infinity || max !== Infinity || precision !== 0) {
                    args.push(min === -Infinity ? -Infinity : min);
                    if (max !== Infinity || precision !== 0) {
                        args.push(max === Infinity ? Infinity : max);
                        if (precision !== 0) {
                            args.push(precision);
                        }
                    }
                }
                fields.push(`new Blockly.FieldNumber(${args.join(', ')}), ${JSON.stringify(fieldName)}`);
            } else if (type === 'field_angle') {
                const angle = Number(block.getFieldValue('ANGLE')) || 90;
                const fieldName = block.getFieldValue('FIELDNAME') || 'NAME';
                fields.push(`new Blockly.FieldNumber(${angle}, 0, 360), ${JSON.stringify(fieldName)}`);
            } else if (type === 'field_dropdown') {
                const fieldName = block.getFieldValue('FIELDNAME') || 'NAME';
                const options: string[] = [];
                for (let i = 0; i < 3; i++) {
                    const user = block.getFieldValue('USER' + i) || 'option';
                    const cpu = block.getFieldValue('CPU' + i) || 'OPTIONNAME';
                    options.push(`[${JSON.stringify(user)}, ${JSON.stringify(cpu)}]`);
                }
                fields.push(`new Blockly.FieldDropdown([${options.join(', ')}]), ${JSON.stringify(fieldName)}`);
            } else if (type === 'field_checkbox') {
                const checked = block.getFieldValue('CHECKED') || 'TRUE';
                const fieldName = block.getFieldValue('FIELDNAME') || 'NAME';
                fields.push(`new Blockly.FieldCheckbox(${JSON.stringify(checked)}), ${JSON.stringify(fieldName)}`);
            } else if (type === 'field_colour') {
                const colourValue = block.getFieldValue('COLOUR') || '#ff0000';
                const fieldName = block.getFieldValue('FIELDNAME') || 'NAME';
                fields.push(`new Blockly.FieldDropdown([['red','#ff0000'],['green','#00ff00'],['blue','#0000ff']]), ${JSON.stringify(fieldName)} /* colour: ${colourValue} */`);
            } else if (type === 'field_variable') {
                const varName = block.getFieldValue('TEXT') || 'item';
                const fieldName = block.getFieldValue('FIELDNAME') || 'NAME';
                fields.push(`new Blockly.FieldVariable(${JSON.stringify(varName)}), ${JSON.stringify(fieldName)}`);
            } else if (type === 'field_image') {
                const src = block.getFieldValue('SRC') || '';
                const width = Number(block.getFieldValue('WIDTH')) || 15;
                const height = Number(block.getFieldValue('HEIGHT')) || 15;
                const alt = block.getFieldValue('ALT') || '*';
                fields.push(`new Blockly.FieldImage(${JSON.stringify(src)}, ${width}, ${height}, { alt: ${JSON.stringify(alt)} })`);
            }
            
            block = block.getNextBlock();
        }
        return fields;
    }, []);

    // 从工厂工作区生成积木定义代码 (JavaScript 格式)
    const formatJavaScript = useCallback((blockType: string, rootBlock: Blockly.Block): string => {
        const code: string[] = [];
        code.push(`Blockly.Blocks['${blockType}'] = {`);
        code.push('  init: function() {');
        
        // 输入类型映射
        const TYPES: Record<string, string> = {
            'input_value': 'appendValueInput',
            'input_statement': 'appendStatementInput',
            'input_dummy': 'appendDummyInput'
        };
        
        // 遍历输入
        let contentsBlock = rootBlock.getInputTargetBlock('INPUTS');
        while (contentsBlock) {
            let inputName = '';
            if (contentsBlock.type !== 'input_dummy') {
                inputName = JSON.stringify(contentsBlock.getFieldValue('INPUTNAME') || 'NAME');
            }
            
            code.push(`    this.${TYPES[contentsBlock.type]}(${inputName})`);
            
            // 类型检查
            const check = getOptTypesFrom(contentsBlock, 'TYPE');
            if (check) {
                code.push(`        .setCheck(${check})`);
            }
            
            // 对齐
            const align = contentsBlock.getFieldValue('ALIGN');
            if (align && align !== 'LEFT') {
                code.push(`        .setAlign(Blockly.inputs.Align.${align})`);
            }
            
            // 字段
            const fieldsBlock = contentsBlock.getInputTargetBlock('FIELDS');
            const fields = getFieldsJs(fieldsBlock);
            for (const field of fields) {
                code.push(`        .appendField(${field})`);
            }
            
            // 添加分号
            code[code.length - 1] += ';';
            
            contentsBlock = contentsBlock.getNextBlock();
        }
        
        // 内联设置
        const inline = rootBlock.getFieldValue('INLINE');
        if (inline === 'EXT') {
            code.push('    this.setInputsInline(false);');
        } else if (inline === 'INT') {
            code.push('    this.setInputsInline(true);');
        }
        
        // 连接类型
        const connections = rootBlock.getFieldValue('CONNECTIONS');
        if (connections === 'LEFT') {
            const outputType = getOptTypesFrom(rootBlock, 'OUTPUTTYPE');
            code.push(`    this.setOutput(true${outputType ? ', ' + outputType : ''});`);
        } else if (connections === 'BOTH') {
            const topType = getOptTypesFrom(rootBlock, 'TOPTYPE');
            const bottomType = getOptTypesFrom(rootBlock, 'BOTTOMTYPE');
            code.push(`    this.setPreviousStatement(true${topType ? ', ' + topType : ''});`);
            code.push(`    this.setNextStatement(true${bottomType ? ', ' + bottomType : ''});`);
        } else if (connections === 'TOP') {
            const topType = getOptTypesFrom(rootBlock, 'TOPTYPE');
            code.push(`    this.setPreviousStatement(true${topType ? ', ' + topType : ''});`);
        } else if (connections === 'BOTTOM') {
            const bottomType = getOptTypesFrom(rootBlock, 'BOTTOMTYPE');
            code.push(`    this.setNextStatement(true${bottomType ? ', ' + bottomType : ''});`);
        }
        
        // 颜色
        const colourBlock = rootBlock.getInputTargetBlock('COLOUR');
        if (colourBlock) {
            const hue = parseInt(colourBlock.getFieldValue('HUE'), 10);
            if (!isNaN(hue)) {
                code.push(`    this.setColour(${hue});`);
            }
        }
        
        // 提示
        const tooltipBlock = rootBlock.getInputTargetBlock('TOOLTIP');
        const tooltip = tooltipBlock ? (tooltipBlock.getFieldValue('TEXT') || '') : '';
        code.push(`    this.setTooltip(${JSON.stringify(tooltip)});`);
        
        // 帮助URL
        const helpUrlBlock = rootBlock.getInputTargetBlock('HELPURL');
        const helpUrl = helpUrlBlock ? (helpUrlBlock.getFieldValue('TEXT') || '') : '';
        code.push(`    this.setHelpUrl(${JSON.stringify(helpUrl)});`);
        
        code.push('  }');
        code.push('};');
        
        return code.join('\n');
    }, [getOptTypesFrom, getFieldsJs]);

    // 生成 JSON 格式定义
    const formatJson = useCallback((blockType: string, rootBlock: Blockly.Block): string => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const js: any = { type: blockType };
        
        const message: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args: any[] = [];
        
        let contentsBlock = rootBlock.getInputTargetBlock('INPUTS');
        while (contentsBlock) {
            // 处理字段
            const fieldsBlock = contentsBlock.getInputTargetBlock('FIELDS');
            let fieldBlock = fieldsBlock;
            while (fieldBlock) {
                if (fieldBlock.type === 'field_static') {
                    message.push(fieldBlock.getFieldValue('TEXT') || '');
                } else {
                    args.push(getFieldJson(fieldBlock));
                    message.push('%' + args.length);
                }
                fieldBlock = fieldBlock.getNextBlock();
            }
            
            // 处理输入
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const input: any = { type: contentsBlock.type };
            if (contentsBlock.type !== 'input_dummy') {
                input.name = contentsBlock.getFieldValue('INPUTNAME') || 'NAME';
            }
            
            const typeBlock = contentsBlock.getInputTargetBlock('TYPE');
            if (typeBlock && typeBlock.type !== 'type_null') {
                input.check = getTypeValue(typeBlock);
            }
            
            const align = contentsBlock.getFieldValue('ALIGN');
            if (align && align !== 'LEFT') {
                input.align = align;
            }
            
            args.push(input);
            message.push('%' + args.length);
            
            contentsBlock = contentsBlock.getNextBlock();
        }
        
        js.message0 = message.join(' ');
        if (args.length > 0) {
            js.args0 = args;
        }
        
        // 内联
        const inline = rootBlock.getFieldValue('INLINE');
        if (inline === 'EXT') {
            js.inputsInline = false;
        } else if (inline === 'INT') {
            js.inputsInline = true;
        }
        
        // 连接
        const connections = rootBlock.getFieldValue('CONNECTIONS');
        if (connections === 'LEFT') {
            js.output = getTypeFromInput(rootBlock, 'OUTPUTTYPE');
        } else if (connections === 'BOTH') {
            js.previousStatement = getTypeFromInput(rootBlock, 'TOPTYPE');
            js.nextStatement = getTypeFromInput(rootBlock, 'BOTTOMTYPE');
        } else if (connections === 'TOP') {
            js.previousStatement = getTypeFromInput(rootBlock, 'TOPTYPE');
        } else if (connections === 'BOTTOM') {
            js.nextStatement = getTypeFromInput(rootBlock, 'BOTTOMTYPE');
        }
        
        // 颜色
        const colourBlock = rootBlock.getInputTargetBlock('COLOUR');
        if (colourBlock) {
            js.colour = parseInt(colourBlock.getFieldValue('HUE'), 10) || 230;
        }
        
        // 提示和帮助
        const tooltipBlock = rootBlock.getInputTargetBlock('TOOLTIP');
        js.tooltip = tooltipBlock ? (tooltipBlock.getFieldValue('TEXT') || '') : '';
        
        const helpUrlBlock = rootBlock.getInputTargetBlock('HELPURL');
        js.helpUrl = helpUrlBlock ? (helpUrlBlock.getFieldValue('TEXT') || '') : '';
        
        return JSON.stringify(js, null, 2);
    }, []);

    // 获取字段 JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getFieldJson = (block: Blockly.Block): any => {
        const type = block.type;
        if (type === 'field_input') {
            return {
                type: 'field_input',
                name: block.getFieldValue('FIELDNAME') || 'NAME',
                text: block.getFieldValue('TEXT') || 'default'
            };
        } else if (type === 'field_number') {
            return {
                type: 'field_number',
                name: block.getFieldValue('FIELDNAME') || 'NAME',
                value: Number(block.getFieldValue('VALUE')) || 0
            };
        } else if (type === 'field_dropdown') {
            const options: [string, string][] = [];
            for (let i = 0; i < 3; i++) {
                options.push([
                    block.getFieldValue('USER' + i) || 'option',
                    block.getFieldValue('CPU' + i) || 'OPTIONNAME'
                ]);
            }
            return {
                type: 'field_dropdown',
                name: block.getFieldValue('FIELDNAME') || 'NAME',
                options: options
            };
        } else if (type === 'field_checkbox') {
            return {
                type: 'field_checkbox',
                name: block.getFieldValue('FIELDNAME') || 'NAME',
                checked: block.getFieldValue('CHECKED') === 'TRUE'
            };
        }
        return { type: 'field_label', text: '' };
    };

    // 获取类型值
    const getTypeValue = (typeBlock: Blockly.Block): string | null => {
        const type = typeBlock.type;
        if (type === 'type_null') return null;
        if (type === 'type_boolean') return 'Boolean';
        if (type === 'type_number') return 'Number';
        if (type === 'type_string') return 'String';
        if (type === 'type_list') return 'Array';
        if (type === 'type_other') return typeBlock.getFieldValue('TYPE') || null;
        return null;
    };

    // 从输入获取类型
    const getTypeFromInput = (block: Blockly.Block, inputName: string): string | null => {
        const typeBlock = block.getInputTargetBlock(inputName);
        if (!typeBlock) return null;
        return getTypeValue(typeBlock);
    };

    // 生成 Python 代码生成器
    const generatePythonGenerator = useCallback((blockType: string, rootBlock: Blockly.Block): string => {
        const code: string[] = [];
        const hasOutput = rootBlock.getFieldValue('CONNECTIONS') === 'LEFT';
        
        code.push(`pythonGenerator.forBlock['${blockType}'] = function(block, generator) {`);
        
        // 遍历输入生成变量获取代码
        let contentsBlock = rootBlock.getInputTargetBlock('INPUTS');
        while (contentsBlock) {
            const inputName = contentsBlock.getFieldValue('INPUTNAME') || 'NAME';
            
            // 处理字段
            const fieldsBlock = contentsBlock.getInputTargetBlock('FIELDS');
            let fieldBlock = fieldsBlock;
            while (fieldBlock) {
                const fieldName = fieldBlock.getFieldValue('FIELDNAME');
                if (fieldName) {
                    const varName = fieldName.toLowerCase().replace(/\W/g, '_');
                    if (fieldBlock.type === 'field_checkbox') {
                        code.push(`  var checkbox_${varName} = block.getFieldValue('${fieldName}') === 'TRUE';`);
                    } else {
                        const prefix = fieldBlock.type.replace('field_', '');
                        code.push(`  var ${prefix}_${varName} = block.getFieldValue('${fieldName}');`);
                    }
                }
                fieldBlock = fieldBlock.getNextBlock();
            }
            
            // 处理输入
            if (contentsBlock.type === 'input_value') {
                const varName = inputName.toLowerCase().replace(/\W/g, '_');
                code.push(`  var value_${varName} = generator.valueToCode(block, '${inputName}', python.Order.ATOMIC);`);
            } else if (contentsBlock.type === 'input_statement') {
                const varName = inputName.toLowerCase().replace(/\W/g, '_');
                code.push(`  var statements_${varName} = generator.statementToCode(block, '${inputName}');`);
            }
            
            contentsBlock = contentsBlock.getNextBlock();
        }
        
        code.push("  // TODO: Assemble python into code variable.");
        
        if (hasOutput) {
            code.push("  var code = '...';");
            code.push("  // TODO: Change python.Order.NONE to the correct strength.");
            code.push("  return [code, python.Order.NONE];");
        } else {
            code.push("  var code = '...\\n';");
            code.push("  return code;");
        }
        
        code.push("};");
        
        return code.join('\n');
    }, []);

    // JavaScript 代码生成器
    const generateJavaScriptGenerator = useCallback((blockType: string, rootBlock: Blockly.Block): string => {
        const code: string[] = [];
        
        code.push("// JavaScript code generator for " + blockType);
        code.push("import {javascriptGenerator, Order} from 'blockly/javascript';");
        code.push("");
        code.push(`javascriptGenerator.forBlock['${blockType}'] = function(block, generator) {`);
        
        const connections = rootBlock.getFieldValue('CONNECTIONS');
        const hasOutput = connections === 'LEFT';
        
        let contentsBlock = rootBlock.getInputTargetBlock('INPUTS');
        while (contentsBlock) {
            const inputName = contentsBlock.getFieldValue('INPUTNAME') || 'NAME';
            const fieldsBlock = contentsBlock.getInputTargetBlock('FIELDS');
            
            let fieldBlock = fieldsBlock;
            while (fieldBlock) {
                const fieldName = fieldBlock.getFieldValue('FIELDNAME');
                if (fieldName) {
                    const varName = fieldName.toLowerCase().replace(/\W/g, '_');
                    if (fieldBlock.type === 'field_checkbox') {
                        code.push(`  var checkbox_${varName} = block.getFieldValue('${fieldName}') === 'TRUE';`);
                    } else if (fieldBlock.type === 'field_dropdown') {
                        code.push(`  var dropdown_${varName} = block.getFieldValue('${fieldName}');`);
                    } else if (fieldBlock.type === 'field_number') {
                        code.push(`  var number_${varName} = block.getFieldValue('${fieldName}');`);
                    } else {
                        const prefix = fieldBlock.type.replace('field_', '');
                        code.push(`  var ${prefix}_${varName} = block.getFieldValue('${fieldName}');`);
                    }
                }
                fieldBlock = fieldBlock.getNextBlock();
            }
            
            if (contentsBlock.type === 'input_value') {
                const varName = inputName.toLowerCase().replace(/\W/g, '_');
                code.push(`  var value_${varName} = generator.valueToCode(block, '${inputName}', Order.ATOMIC);`);
            } else if (contentsBlock.type === 'input_statement') {
                const varName = inputName.toLowerCase().replace(/\W/g, '_');
                code.push(`  var statements_${varName} = generator.statementToCode(block, '${inputName}');`);
            }
            
            contentsBlock = contentsBlock.getNextBlock();
        }
        
        code.push("  // TODO: Assemble JavaScript into code variable.");
        
        if (hasOutput) {
            code.push("  var code = '...';");
            code.push("  // TODO: Change Order.NONE to the correct strength.");
            code.push("  return [code, Order.NONE];");
        } else {
            code.push("  var code = '...;\\n';");
            code.push("  return code;");
        }
        
        code.push("};");
        
        return code.join('\n');
    }, []);

    // C/C++ 代码生成器
    const generateCppGenerator = useCallback((blockType: string, rootBlock: Blockly.Block): string => {
        const code: string[] = [];
        
        code.push("// C/C++ code generator for " + blockType);
        code.push("// Note: Blockly doesn't have a built-in C/C++ generator.");
        code.push("// You need to create a custom generator or use a community plugin.");
        code.push("// Below is a template based on the JavaScript generator pattern.");
        code.push("");
        code.push("// First, create a C/C++ generator (if not exists):");
        code.push("// const cppGenerator = new Blockly.Generator('C++');");
        code.push("");
        code.push(`cppGenerator.forBlock['${blockType}'] = function(block, generator) {`);
        
        const connections = rootBlock.getFieldValue('CONNECTIONS');
        const hasOutput = connections === 'LEFT';
        
        let contentsBlock = rootBlock.getInputTargetBlock('INPUTS');
        while (contentsBlock) {
            const inputName = contentsBlock.getFieldValue('INPUTNAME') || 'NAME';
            const fieldsBlock = contentsBlock.getInputTargetBlock('FIELDS');
            
            let fieldBlock = fieldsBlock;
            while (fieldBlock) {
                const fieldName = fieldBlock.getFieldValue('FIELDNAME');
                if (fieldName) {
                    const varName = fieldName.toLowerCase().replace(/\W/g, '_');
                    if (fieldBlock.type === 'field_checkbox') {
                        code.push(`  var checkbox_${varName} = block.getFieldValue('${fieldName}') === 'TRUE';`);
                    } else if (fieldBlock.type === 'field_number') {
                        code.push(`  var number_${varName} = block.getFieldValue('${fieldName}');`);
                    } else {
                        const prefix = fieldBlock.type.replace('field_', '');
                        code.push(`  var ${prefix}_${varName} = block.getFieldValue('${fieldName}');`);
                    }
                }
                fieldBlock = fieldBlock.getNextBlock();
            }
            
            if (contentsBlock.type === 'input_value') {
                const varName = inputName.toLowerCase().replace(/\W/g, '_');
                code.push(`  var value_${varName} = generator.valueToCode(block, '${inputName}', generator.ORDER_ATOMIC);`);
            } else if (contentsBlock.type === 'input_statement') {
                const varName = inputName.toLowerCase().replace(/\W/g, '_');
                code.push(`  var statements_${varName} = generator.statementToCode(block, '${inputName}');`);
            }
            
            contentsBlock = contentsBlock.getNextBlock();
        }
        
        code.push("  // TODO: Assemble C/C++ code into code variable.");
        code.push("  // Remember C/C++ specific syntax: semicolons, braces, types, etc.");
        
        if (hasOutput) {
            code.push("  var code = '/* expression */';");
            code.push("  return [code, generator.ORDER_NONE];");
        } else {
            code.push("  var code = '/* statement */;\\n';");
            code.push("  return code;");
        }
        
        code.push("};");
        code.push("");
        code.push("// C/C++ specific notes:");
        code.push("// - Use appropriate data types (int, float, char*, etc.)");
        code.push("// - Include necessary headers (#include <stdio.h>)");
        code.push("// - Handle memory management if needed");
        code.push("// - Consider using Arduino-specific functions for embedded projects");
        
        return code.join('\n');
    }, []);

    // 主要的代码生成函数
    const generateBlockCode = useCallback(() => {
        if (!workspaceRef.current) return;
        
        const rootBlock = getRootBlock(workspaceRef.current);
        if (!rootBlock) {
            setBlockDefinition('// Add inputs and other blocks to the factory_base block');
            setGeneratorCode('// No generator code yet');
            return;
        }
        
        const blockType = (rootBlock.getFieldValue('NAME') || 'block_type').trim().toLowerCase().replace(/\W/g, '_');
        
        // 根据格式生成代码
        let blockDef: string;
        if (format === 'JSON') {
            blockDef = formatJson(blockType, rootBlock);
        } else {
            blockDef = formatJavaScript(blockType, rootBlock);
        }
        
        // 根据语言生成代码生成器
        let genCode: string;
        switch (generatorLanguage) {
            case 'JavaScript':
                genCode = generateJavaScriptGenerator(blockType, rootBlock);
                break;
            case 'C/C++':
                genCode = generateCppGenerator(blockType, rootBlock);
                break;
            case 'Python':
            default:
                genCode = generatePythonGenerator(blockType, rootBlock);
                break;
        }
        
        // 生成 Code Headers
        const headers = generateCodeHeaders();
        
        setCodeHeaders(headers);
        setBlockDefinition(blockDef);
        setGeneratorCode(genCode);
        
        // 更新预览
        updatePreview(blockType, rootBlock);
    }, [format, generatorLanguage, getRootBlock, formatJavaScript, formatJson, generatePythonGenerator, generateJavaScriptGenerator, generateCppGenerator, generateCodeHeaders]);

    // 更新预览工作区 - 与官方 Block Factory 一致
    const updatePreview = useCallback((_blockType: string, rootBlock: Blockly.Block) => {
        if (!previewWorkspaceRef.current) return;

        // 清除预览
        previewWorkspaceRef.current.clear();

        try {
            // 获取颜色
            const colourBlock = rootBlock.getInputTargetBlock('COLOUR');
            const hue = colourBlock ? (parseInt(colourBlock.getFieldValue('HUE'), 10) || 230) : 230;
            
            // 获取提示
            const tooltipBlock = rootBlock.getInputTargetBlock('TOOLTIP');
            const tooltip = tooltipBlock ? (tooltipBlock.getFieldValue('TEXT') || '') : '';

            // 临时注册预览积木
            const previewBlockName = `preview_${Date.now()}`;
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Blockly.Blocks as any)[previewBlockName] = {
                init: function(this: Blockly.Block) {
                    // 解析输入
                    let inputBlock = rootBlock.getInputTargetBlock('INPUTS');
                    while (inputBlock) {
                        const inputType = inputBlock.type;
                        
                        if (inputType === 'input_value') {
                            const inputName = inputBlock.getFieldValue('INPUTNAME') || 'NAME';
                            const input = this.appendValueInput(inputName);
                            
                            // 添加字段
                            const fieldsBlock = inputBlock.getInputTargetBlock('FIELDS');
                            addFieldsToInput(input, fieldsBlock);
                            
                            // 类型检查
                            const typeBlock = inputBlock.getInputTargetBlock('TYPE');
                            if (typeBlock && typeBlock.type !== 'type_null') {
                                input.setCheck(getTypeValue(typeBlock));
                            }
                        } else if (inputType === 'input_statement') {
                            const inputName = inputBlock.getFieldValue('INPUTNAME') || 'NAME';
                            const input = this.appendStatementInput(inputName);
                            
                            // 添加字段
                            const fieldsBlock = inputBlock.getInputTargetBlock('FIELDS');
                            addFieldsToInput(input, fieldsBlock);
                        } else if (inputType === 'input_dummy') {
                            const input = this.appendDummyInput();
                            
                            // 添加字段
                            const fieldsBlock = inputBlock.getInputTargetBlock('FIELDS');
                            addFieldsToInput(input, fieldsBlock);
                        }
                        
                        inputBlock = inputBlock.getNextBlock();
                    }

                    // 内联设置
                    const inline = rootBlock.getFieldValue('INLINE');
                    if (inline === 'EXT') {
                        this.setInputsInline(false);
                    } else if (inline === 'INT') {
                        this.setInputsInline(true);
                    }

                    // 设置连接
                    const connections = rootBlock.getFieldValue('CONNECTIONS');
                    if (connections === 'LEFT') {
                        this.setOutput(true);
                    } else if (connections === 'BOTH') {
                        this.setPreviousStatement(true);
                        this.setNextStatement(true);
                    } else if (connections === 'TOP') {
                        this.setPreviousStatement(true);
                    } else if (connections === 'BOTTOM') {
                        this.setNextStatement(true);
                    }

                    this.setColour(hue);
                    this.setTooltip(tooltip);
                }
            };

            // 添加到预览工作区
            const previewBlock = previewWorkspaceRef.current.newBlock(previewBlockName);
            previewBlock.initSvg();
            previewBlock.render();
            previewBlock.moveBy(20, 20);

            // 清理临时积木定义
            setTimeout(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (Blockly.Blocks as any)[previewBlockName];
            }, 100);

        } catch (e) {
            console.error('Preview error:', e);
        }
    }, []);

    // 辅助函数：添加字段到输入
    const addFieldsToInput = (input: Blockly.Input, fieldBlock: Blockly.Block | null) => {
        while (fieldBlock) {
            const fieldType = fieldBlock.type;
            
            if (fieldType === 'field_static') {
                const text = fieldBlock.getFieldValue('TEXT') || '';
                input.appendField(text);
            } else if (fieldType === 'field_input') {
                const text = fieldBlock.getFieldValue('TEXT') || 'default';
                const fieldName = fieldBlock.getFieldValue('FIELDNAME') || 'NAME';
                input.appendField(new Blockly.FieldTextInput(text), fieldName);
            } else if (fieldType === 'field_number') {
                const value = Number(fieldBlock.getFieldValue('VALUE')) || 0;
                const fieldName = fieldBlock.getFieldValue('FIELDNAME') || 'NAME';
                input.appendField(new Blockly.FieldNumber(value), fieldName);
            } else if (fieldType === 'field_angle') {
                const angle = Number(fieldBlock.getFieldValue('ANGLE')) || 90;
                const fieldName = fieldBlock.getFieldValue('FIELDNAME') || 'NAME';
                input.appendField(new Blockly.FieldNumber(angle, 0, 360), fieldName);
            } else if (fieldType === 'field_dropdown') {
                const fieldName = fieldBlock.getFieldValue('FIELDNAME') || 'NAME';
                const options: [string, string][] = [];
                for (let i = 0; i < 3; i++) {
                    options.push([
                        fieldBlock.getFieldValue('USER' + i) || 'option',
                        fieldBlock.getFieldValue('CPU' + i) || 'OPTIONNAME'
                    ]);
                }
                input.appendField(new Blockly.FieldDropdown(options), fieldName);
            } else if (fieldType === 'field_checkbox') {
                const checked = fieldBlock.getFieldValue('CHECKED') || 'TRUE';
                const fieldName = fieldBlock.getFieldValue('FIELDNAME') || 'NAME';
                input.appendField(new Blockly.FieldCheckbox(checked), fieldName);
            } else if (fieldType === 'field_variable') {
                const varName = fieldBlock.getFieldValue('TEXT') || 'item';
                const fieldName = fieldBlock.getFieldValue('FIELDNAME') || 'NAME';
                input.appendField(new Blockly.FieldVariable(varName), fieldName);
            } else if (fieldType === 'field_image') {
                const src = fieldBlock.getFieldValue('SRC') || '';
                const width = Number(fieldBlock.getFieldValue('WIDTH')) || 15;
                const height = Number(fieldBlock.getFieldValue('HEIGHT')) || 15;
                const alt = fieldBlock.getFieldValue('ALT') || '*';
                input.appendField(new Blockly.FieldImage(src, width, height, alt));
            }
            
            fieldBlock = fieldBlock.getNextBlock();
        }
    };

    // 初始化工作区
    useEffect(() => {
        if (!isOpen || !factoryDiv.current || !previewDiv.current) return;

        initFactoryBlocks();

        // 创建工厂工作区
        const workspace = Blockly.inject(factoryDiv.current, {
            toolbox: factoryToolbox,
            renderer: 'zelos',
            theme: Blockly.Themes.Classic,
            grid: {
                spacing: 20,
                length: 3,
                colour: '#555',
                snap: true,
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 0.9,
                maxScale: 2,
                minScale: 0.5,
            },
            trashcan: true,
        } as Blockly.BlocklyOptions);

        workspaceRef.current = workspace;

        // 创建预览工作区
        const previewWorkspace = Blockly.inject(previewDiv.current, {
            renderer: 'zelos',
            theme: Blockly.Themes.Classic,
            readOnly: false,
            scrollbars: false,
            zoom: {
                controls: false,
                wheel: false,
                startScale: 1.0,
            },
        } as Blockly.BlocklyOptions);

        previewWorkspaceRef.current = previewWorkspace;

        // 添加官方 factory_base 积木和默认附属积木
        const starterXml = `
            <xml xmlns="https://developers.google.com/blockly/xml">
                <block type="factory_base" deletable="false" movable="false" x="20" y="20">
                    <value name="TOOLTIP">
                        <block type="text" deletable="false" movable="false">
                            <field name="TEXT"></field>
                        </block>
                    </value>
                    <value name="HELPURL">
                        <block type="text" deletable="false" movable="false">
                            <field name="TEXT"></field>
                        </block>
                    </value>
                    <value name="COLOUR">
                        <block type="colour_hue">
                            <field name="HUE">230</field>
                        </block>
                    </value>
                </block>
            </xml>
        `;
        const xml = Blockly.utils.xml.textToDom(starterXml);
        Blockly.Xml.domToWorkspace(xml, workspace);

        // 监听变化
        workspace.addChangeListener(() => {
            generateBlockCode();
        });

        // 初始生成
        setTimeout(generateBlockCode, 100);

        // 调整大小
        const resizeWorkspaces = () => {
            Blockly.svgResize(workspace);
            Blockly.svgResize(previewWorkspace);
        };

        setTimeout(resizeWorkspaces, 200);

        return () => {
            workspace.dispose();
            previewWorkspace.dispose();
            workspaceRef.current = null;
            previewWorkspaceRef.current = null;
        };
    }, [isOpen, generateBlockCode]);

    // 保存积木
    const handleSave = useCallback(() => {
        if (!workspaceRef.current) return;

        const rootBlock = getRootBlock(workspaceRef.current);
        if (!rootBlock) {
            alert('请先定义一个积木');
            return;
        }

        const savedBlockName = (rootBlock.getFieldValue('NAME') || 'block_type').trim().toLowerCase().replace(/\W/g, '_');
        onSaveBlock(blockDefinition, generatorCode, savedBlockName);
        onClose();
    }, [blockDefinition, generatorCode, onSaveBlock, onClose, getRootBlock]);

    // 复制到剪贴板
    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('已复制到剪贴板');
        });
    }, []);

    // 从 localStorage 加载已保存的积木列表
    const loadSavedBlocksFromStorage = useCallback(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSavedBlocks(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load saved blocks:', e);
        }
    }, [STORAGE_KEY]);

    // 保存积木到 Library
    const saveToLibrary = useCallback(() => {
        if (!workspaceRef.current) return;

        const rootBlock = getRootBlock(workspaceRef.current);
        if (!rootBlock) {
            alert('请先定义一个积木');
            return;
        }

        const blockName = (rootBlock.getFieldValue('NAME') || 'block_type').trim();
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        const xmlText = Blockly.Xml.domToText(xml);

        const newBlocks = [...savedBlocks.filter(b => b.name !== blockName), { name: blockName, xml: xmlText }];
        setSavedBlocks(newBlocks);
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newBlocks));
            alert(`积木 "${blockName}" 已保存到库`);
        } catch (e) {
            console.error('Failed to save to library:', e);
            alert('保存失败');
        }
    }, [workspaceRef, getRootBlock, savedBlocks, STORAGE_KEY]);

    // 从 Library 加载积木
    const loadFromLibrary = useCallback((blockData: {name: string, xml: string}) => {
        if (!workspaceRef.current) return;

        try {
            workspaceRef.current.clear();
            const xml = Blockly.utils.xml.textToDom(blockData.xml);
            Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
            setShowLibrary(false);
            setTimeout(generateBlockCode, 100);
        } catch (e) {
            console.error('Failed to load block:', e);
            alert('加载失败');
        }
    }, [generateBlockCode]);

    // 从 Library 删除积木
    const deleteFromLibrary = useCallback((blockName: string) => {
        if (!confirm(`确定删除积木 "${blockName}" 吗？`)) return;
        
        const newBlocks = savedBlocks.filter(b => b.name !== blockName);
        setSavedBlocks(newBlocks);
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newBlocks));
        } catch (e) {
            console.error('Failed to delete from library:', e);
        }
    }, [savedBlocks, STORAGE_KEY]);

    // 初始化时加载已保存的积木
    useEffect(() => {
        if (isOpen) {
            loadSavedBlocksFromStorage();
        }
    }, [isOpen, loadSavedBlocksFromStorage]);

    if (!isOpen) return null;

    return (
        <div className="block-factory-overlay" onClick={onClose}>
            <div className="block-factory-content" onClick={(e) => e.stopPropagation()}>
                {/* 标题栏 */}
                <div className="block-factory-header">
                    <h2>🏭 Block Factory - 自定义积木设计器</h2>
                    <div className="block-factory-toolbar">
                        <button className="toolbar-btn" onClick={saveToLibrary} title="保存到积木库">
                            💾 保存
                        </button>
                        <button className="toolbar-btn" onClick={() => setShowLibrary(!showLibrary)} title="打开积木库">
                            📚 库 ({savedBlocks.length})
                        </button>
                    </div>
                    <button className="block-factory-close" onClick={onClose}>×</button>
                </div>

                {/* 积木库面板 */}
                {showLibrary && (
                    <div className="block-library-panel">
                        <div className="block-library-header">
                            <h3>📚 积木库</h3>
                            <button className="library-close-btn" onClick={() => setShowLibrary(false)}>×</button>
                        </div>
                        <div className="block-library-list">
                            {savedBlocks.length === 0 ? (
                                <div className="library-empty">暂无保存的积木</div>
                            ) : (
                                savedBlocks.map((block, index) => (
                                    <div key={index} className="library-item">
                                        <span className="library-item-name">{block.name}</span>
                                        <div className="library-item-actions">
                                            <button onClick={() => loadFromLibrary(block)} title="加载">📂</button>
                                            <button onClick={() => deleteFromLibrary(block.name)} title="删除">🗑️</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* 主体 */}
                <div className="block-factory-body">
                    {/* 左侧：设计区 */}
                    <div className="block-factory-design">
                        <h3>积木设计</h3>
                        <div ref={factoryDiv} className="block-factory-workspace" />
                    </div>

                    {/* 右侧：预览和代码 */}
                    <div className="block-factory-output">
                        {/* 预览区 */}
                        <div className="block-factory-preview-section">
                            <h3>积木预览</h3>
                            <div ref={previewDiv} className="block-factory-preview" />
                        </div>

                        {/* 代码输出区 */}
                        <div className="block-factory-code-section">
                            <div className="block-factory-tabs">
                                <button 
                                    className={`tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('headers')}
                                >
                                    Headers
                                </button>
                                <button 
                                    className={`tab-btn ${activeTab === 'definition' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('definition')}
                                >
                                    积木定义
                                </button>
                                <button 
                                    className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('generator')}
                                >
                                    代码生成器
                                </button>
                            </div>
                            <div className="block-factory-options">
                                <select 
                                    className="format-select"
                                    value={importFormat}
                                    onChange={(e) => setImportFormat(e.target.value as 'script' | 'import')}
                                    title="导入格式"
                                >
                                    <option value="import">import</option>
                                    <option value="script">&lt;script&gt;</option>
                                </select>
                                <select 
                                    className="format-select"
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as 'JSON' | 'JavaScript')}
                                    title="积木定义格式"
                                >
                                    <option value="JavaScript">JS 定义</option>
                                    <option value="JSON">JSON 定义</option>
                                </select>
                                <select 
                                    className="format-select"
                                    value={generatorLanguage}
                                    onChange={(e) => setGeneratorLanguage(e.target.value as 'Python' | 'JavaScript' | 'C/C++')}
                                    title="代码生成器语言"
                                >
                                    <option value="Python">Python</option>
                                    <option value="JavaScript">JavaScript</option>
                                    <option value="C/C++">C/C++</option>
                                </select>
                            </div>
                            <div className="block-factory-code">
                                <pre>{activeTab === 'headers' ? codeHeaders : activeTab === 'definition' ? blockDefinition : generatorCode}</pre>
                                <button 
                                    className="copy-btn"
                                    onClick={() => handleCopy(activeTab === 'headers' ? codeHeaders : activeTab === 'definition' ? blockDefinition : generatorCode)}
                                >
                                    📋 复制
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="block-factory-footer">
                    <button className="factory-btn factory-btn-cancel" onClick={onClose}>
                        取消
                    </button>
                    <button className="factory-btn factory-btn-save" onClick={handleSave}>
                        保存积木
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlockFactory;

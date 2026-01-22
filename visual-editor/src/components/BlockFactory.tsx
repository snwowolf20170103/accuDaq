/**
 * Block Factory 组件
 * 嵌入 Blockly 官方 Block Factory 功能，允许用户可视化设计自定义积木
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import './BlockFactory.css';

// Block Factory 专用积木定义
const factoryBlocks = () => {
    // ========== 输入类型积木 ==========
    
    // 值输入
    Blockly.Blocks['factory_input_value'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('值输入')
                .appendField(new Blockly.FieldTextInput('VALUE'), 'INPUT_NAME');
            this.appendDummyInput()
                .appendField('类型检查')
                .appendField(new Blockly.FieldDropdown([
                    ['任意', 'null'],
                    ['数字', 'Number'],
                    ['字符串', 'String'],
                    ['布尔', 'Boolean'],
                    ['数组', 'Array'],
                ]), 'CHECK_TYPE');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(230);
            this.setTooltip('添加一个值输入插槽');
        }
    };

    // 语句输入
    Blockly.Blocks['factory_input_statement'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('语句输入')
                .appendField(new Blockly.FieldTextInput('DO'), 'INPUT_NAME');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(230);
            this.setTooltip('添加一个语句输入插槽（用于嵌套积木）');
        }
    };

    // 空输入（仅用于添加字段）
    Blockly.Blocks['factory_input_dummy'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('空输入行');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(230);
            this.setTooltip('添加一个空输入行（仅用于放置字段）');
        }
    };

    // ========== 字段类型积木 ==========

    // 文本标签
    Blockly.Blocks['factory_field_label'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('文本标签')
                .appendField(new Blockly.FieldTextInput('标签'), 'TEXT');
            this.setOutput(true, 'Field');
            this.setColour(160);
            this.setTooltip('添加固定文本标签');
        }
    };

    // 文本输入字段
    Blockly.Blocks['factory_field_input'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('文本输入')
                .appendField(new Blockly.FieldTextInput('FIELD'), 'FIELD_NAME')
                .appendField('默认值')
                .appendField(new Blockly.FieldTextInput(''), 'DEFAULT');
            this.setOutput(true, 'Field');
            this.setColour(160);
            this.setTooltip('添加可编辑文本输入字段');
        }
    };

    // 数字输入字段
    Blockly.Blocks['factory_field_number'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('数字输入')
                .appendField(new Blockly.FieldTextInput('NUM'), 'FIELD_NAME')
                .appendField('默认')
                .appendField(new Blockly.FieldNumber(0), 'DEFAULT')
                .appendField('最小')
                .appendField(new Blockly.FieldNumber(-Infinity), 'MIN')
                .appendField('最大')
                .appendField(new Blockly.FieldNumber(Infinity), 'MAX');
            this.setOutput(true, 'Field');
            this.setColour(160);
            this.setTooltip('添加数字输入字段');
        }
    };

    // 下拉菜单字段
    Blockly.Blocks['factory_field_dropdown'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('下拉菜单')
                .appendField(new Blockly.FieldTextInput('OPTION'), 'FIELD_NAME');
            this.appendDummyInput()
                .appendField('选项1:')
                .appendField(new Blockly.FieldTextInput('选项A'), 'OPTION1_TEXT')
                .appendField('值:')
                .appendField(new Blockly.FieldTextInput('A'), 'OPTION1_VALUE');
            this.appendDummyInput()
                .appendField('选项2:')
                .appendField(new Blockly.FieldTextInput('选项B'), 'OPTION2_TEXT')
                .appendField('值:')
                .appendField(new Blockly.FieldTextInput('B'), 'OPTION2_VALUE');
            this.appendDummyInput()
                .appendField('选项3:')
                .appendField(new Blockly.FieldTextInput('选项C'), 'OPTION3_TEXT')
                .appendField('值:')
                .appendField(new Blockly.FieldTextInput('C'), 'OPTION3_VALUE');
            this.setOutput(true, 'Field');
            this.setColour(160);
            this.setTooltip('添加下拉选择菜单');
        }
    };

    // 复选框字段
    Blockly.Blocks['factory_field_checkbox'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('复选框')
                .appendField(new Blockly.FieldTextInput('CHECKED'), 'FIELD_NAME')
                .appendField('默认')
                .appendField(new Blockly.FieldCheckbox('TRUE'), 'DEFAULT');
            this.setOutput(true, 'Field');
            this.setColour(160);
            this.setTooltip('添加复选框字段');
        }
    };

    // ========== 积木属性积木 ==========

    // 积木定义（根积木）
    Blockly.Blocks['factory_block_definition'] = {
        init: function(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('🧩 积木名称')
                .appendField(new Blockly.FieldTextInput('custom_block'), 'BLOCK_NAME');
            this.appendDummyInput()
                .appendField('颜色')
                .appendField(new Blockly.FieldDropdown([
                    ['蓝色', '#5C81A6'],
                    ['绿色', '#5CA65C'],
                    ['紫色', '#9B59B6'],
                    ['红色', '#E74C3C'],
                    ['橙色', '#F39C12'],
                    ['青色', '#1ABC9C'],
                    ['粉色', '#E91E63'],
                    ['灰色', '#607D8B'],
                ]), 'COLOUR');
            this.appendDummyInput()
                .appendField('提示文字')
                .appendField(new Blockly.FieldTextInput('这是一个自定义积木'), 'TOOLTIP');
            this.appendStatementInput('INPUTS')
                .setCheck('Input')
                .appendField('输入');
            this.appendDummyInput()
                .appendField('连接类型')
                .appendField(new Blockly.FieldDropdown([
                    ['无输出（语句积木）', 'statement'],
                    ['有输出（表达式积木）', 'output'],
                    ['均无', 'none'],
                ]), 'CONNECTION_TYPE');
            this.appendDummyInput()
                .appendField('输出类型')
                .appendField(new Blockly.FieldDropdown([
                    ['任意', 'null'],
                    ['数字', 'Number'],
                    ['字符串', 'String'],
                    ['布尔', 'Boolean'],
                ]), 'OUTPUT_TYPE');
            this.setColour(290);
            this.setTooltip('定义一个新的自定义积木');
            this.setDeletable(false);
        }
    };

    // 字段容器
    Blockly.Blocks['factory_field_container'] = {
        init: function(this: Blockly.Block) {
            this.appendValueInput('FIELD')
                .setCheck('Field')
                .appendField('添加字段');
            this.setPreviousStatement(true, 'Input');
            this.setNextStatement(true, 'Input');
            this.setColour(160);
            this.setTooltip('在当前输入行添加一个字段');
        }
    };
};

// Block Factory 工具箱配置
const factoryToolbox = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: '📦 积木定义',
            colour: '#9B59B6',
            contents: [
                { kind: 'block', type: 'factory_block_definition' },
            ]
        },
        {
            kind: 'category',
            name: '📥 输入类型',
            colour: '#3498DB',
            contents: [
                { kind: 'block', type: 'factory_input_value' },
                { kind: 'block', type: 'factory_input_statement' },
                { kind: 'block', type: 'factory_input_dummy' },
            ]
        },
        {
            kind: 'category',
            name: '🏷️ 字段类型',
            colour: '#27AE60',
            contents: [
                { kind: 'block', type: 'factory_field_container' },
                { kind: 'block', type: 'factory_field_label' },
                { kind: 'block', type: 'factory_field_input' },
                { kind: 'block', type: 'factory_field_number' },
                { kind: 'block', type: 'factory_field_dropdown' },
                { kind: 'block', type: 'factory_field_checkbox' },
            ]
        },
    ]
};

// 初始化 Factory 积木
let factoryBlocksInitialized = false;
const initFactoryBlocks = () => {
    if (factoryBlocksInitialized) return;
    factoryBlocks();
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
    const [activeTab, setActiveTab] = useState<'definition' | 'generator'>('definition');

    // 从工厂工作区生成积木定义代码
    const generateBlockCode = useCallback(() => {
        if (!workspaceRef.current) return;

        const blocks = workspaceRef.current.getBlocksByType('factory_block_definition', false);
        if (blocks.length === 0) {
            setBlockDefinition('// 请先添加一个积木定义');
            setGeneratorCode('// 请先添加一个积木定义');
            return;
        }

        const rootBlock = blocks[0];
        const blockName = rootBlock.getFieldValue('BLOCK_NAME') || 'custom_block';
        const colour = rootBlock.getFieldValue('COLOUR') || '#5C81A6';
        const tooltip = rootBlock.getFieldValue('TOOLTIP') || '';
        const connectionType = rootBlock.getFieldValue('CONNECTION_TYPE') || 'statement';
        const outputType = rootBlock.getFieldValue('OUTPUT_TYPE') || 'null';

        // 解析输入
        const inputs: string[] = [];
        const generatorParts: string[] = [];
        let inputBlock = rootBlock.getInputTargetBlock('INPUTS');
        
        while (inputBlock) {
            const inputType = inputBlock.type;
            
            if (inputType === 'factory_input_value') {
                const inputName = inputBlock.getFieldValue('INPUT_NAME') || 'VALUE';
                const checkType = inputBlock.getFieldValue('CHECK_TYPE') || 'null';
                const checkStr = checkType === 'null' ? 'null' : `'${checkType}'`;
                inputs.push(`        this.appendValueInput('${inputName}')\n            .setCheck(${checkStr});`);
                generatorParts.push(`    const ${inputName.toLowerCase()} = generator.valueToCode(block, '${inputName}', Order.ATOMIC) || '0';`);
            } else if (inputType === 'factory_input_statement') {
                const inputName = inputBlock.getFieldValue('INPUT_NAME') || 'DO';
                inputs.push(`        this.appendStatementInput('${inputName}');`);
                generatorParts.push(`    const ${inputName.toLowerCase()} = generator.statementToCode(block, '${inputName}');`);
            } else if (inputType === 'factory_input_dummy') {
                inputs.push(`        this.appendDummyInput();`);
            } else if (inputType === 'factory_field_container') {
                const fieldBlock = inputBlock.getInputTargetBlock('FIELD');
                if (fieldBlock) {
                    const fieldCode = generateFieldCode(fieldBlock);
                    if (fieldCode.def) {
                        inputs.push(`        this.appendDummyInput()\n            ${fieldCode.def};`);
                    }
                    if (fieldCode.gen) {
                        generatorParts.push(fieldCode.gen);
                    }
                }
            }
            
            inputBlock = inputBlock.getNextBlock();
        }

        // 生成连接代码
        let connectionCode = '';
        if (connectionType === 'statement') {
            connectionCode = `        this.setPreviousStatement(true, null);\n        this.setNextStatement(true, null);`;
        } else if (connectionType === 'output') {
            const outType = outputType === 'null' ? 'null' : `'${outputType}'`;
            connectionCode = `        this.setOutput(true, ${outType});`;
        }

        // 生成积木定义
        const blockDef = `Blockly.Blocks['${blockName}'] = {
    init: function(this: Blockly.Block) {
${inputs.join('\n')}
${connectionCode}
        this.setColour('${colour}');
        this.setTooltip('${tooltip}');
        this.setHelpUrl('');
    }
};`;

        // 生成 Python 代码生成器
        const isExpression = connectionType === 'output';
        let genCode = '';
        
        if (isExpression) {
            genCode = `pythonGenerator.forBlock['${blockName}'] = function(
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
${generatorParts.join('\n')}
    const code = \`/* TODO: 实现 ${blockName} 的代码生成 */\`;
    return [code, Order.ATOMIC];
};`;
        } else {
            genCode = `pythonGenerator.forBlock['${blockName}'] = function(
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
${generatorParts.join('\n')}
    let code = '';
    // TODO: 实现 ${blockName} 的代码生成
    return code;
};`;
        }

        setBlockDefinition(blockDef);
        setGeneratorCode(genCode);

        // 更新预览
        updatePreview(blockName, rootBlock);
    }, []);

    // 生成字段代码
    const generateFieldCode = (fieldBlock: Blockly.Block): { def: string, gen: string } => {
        const fieldType = fieldBlock.type;
        
        if (fieldType === 'factory_field_label') {
            const text = fieldBlock.getFieldValue('TEXT') || '标签';
            return { def: `.appendField('${text}')`, gen: '' };
        } else if (fieldType === 'factory_field_input') {
            const fieldName = fieldBlock.getFieldValue('FIELD_NAME') || 'FIELD';
            const defaultVal = fieldBlock.getFieldValue('DEFAULT') || '';
            return {
                def: `.appendField(new Blockly.FieldTextInput('${defaultVal}'), '${fieldName}')`,
                gen: `    const ${fieldName.toLowerCase()} = block.getFieldValue('${fieldName}');`
            };
        } else if (fieldType === 'factory_field_number') {
            const fieldName = fieldBlock.getFieldValue('FIELD_NAME') || 'NUM';
            const defaultVal = fieldBlock.getFieldValue('DEFAULT') || 0;
            const min = fieldBlock.getFieldValue('MIN');
            const max = fieldBlock.getFieldValue('MAX');
            return {
                def: `.appendField(new Blockly.FieldNumber(${defaultVal}, ${min}, ${max}), '${fieldName}')`,
                gen: `    const ${fieldName.toLowerCase()} = block.getFieldValue('${fieldName}');`
            };
        } else if (fieldType === 'factory_field_dropdown') {
            const fieldName = fieldBlock.getFieldValue('FIELD_NAME') || 'OPTION';
            const opt1Text = fieldBlock.getFieldValue('OPTION1_TEXT') || '选项A';
            const opt1Val = fieldBlock.getFieldValue('OPTION1_VALUE') || 'A';
            const opt2Text = fieldBlock.getFieldValue('OPTION2_TEXT') || '选项B';
            const opt2Val = fieldBlock.getFieldValue('OPTION2_VALUE') || 'B';
            const opt3Text = fieldBlock.getFieldValue('OPTION3_TEXT') || '选项C';
            const opt3Val = fieldBlock.getFieldValue('OPTION3_VALUE') || 'C';
            return {
                def: `.appendField(new Blockly.FieldDropdown([['${opt1Text}', '${opt1Val}'], ['${opt2Text}', '${opt2Val}'], ['${opt3Text}', '${opt3Val}']]), '${fieldName}')`,
                gen: `    const ${fieldName.toLowerCase()} = block.getFieldValue('${fieldName}');`
            };
        } else if (fieldType === 'factory_field_checkbox') {
            const fieldName = fieldBlock.getFieldValue('FIELD_NAME') || 'CHECKED';
            const defaultVal = fieldBlock.getFieldValue('DEFAULT') === 'TRUE' ? 'TRUE' : 'FALSE';
            return {
                def: `.appendField(new Blockly.FieldCheckbox('${defaultVal}'), '${fieldName}')`,
                gen: `    const ${fieldName.toLowerCase()} = block.getFieldValue('${fieldName}') === 'TRUE';`
            };
        }
        
        return { def: '', gen: '' };
    };

    // 更新预览工作区
    const updatePreview = useCallback((blockName: string, rootBlock: Blockly.Block) => {
        if (!previewWorkspaceRef.current) return;

        // 清除预览
        previewWorkspaceRef.current.clear();

        try {
            // 动态创建预览积木
            const colour = rootBlock.getFieldValue('COLOUR') || '#5C81A6';
            const tooltip = rootBlock.getFieldValue('TOOLTIP') || '';
            const connectionType = rootBlock.getFieldValue('CONNECTION_TYPE') || 'statement';
            const outputType = rootBlock.getFieldValue('OUTPUT_TYPE') || 'null';

            // 临时注册预览积木
            const previewBlockName = `preview_${Date.now()}`;
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Blockly.Blocks as any)[previewBlockName] = {
                init: function(this: Blockly.Block) {
                    // 解析输入
                    let inputBlock = rootBlock.getInputTargetBlock('INPUTS');
                    while (inputBlock) {
                        const inputType = inputBlock.type;
                        
                        if (inputType === 'factory_input_value') {
                            const inputName = inputBlock.getFieldValue('INPUT_NAME') || 'VALUE';
                            const checkType = inputBlock.getFieldValue('CHECK_TYPE');
                            const input = this.appendValueInput(inputName);
                            if (checkType && checkType !== 'null') {
                                input.setCheck(checkType);
                            }
                        } else if (inputType === 'factory_input_statement') {
                            const inputName = inputBlock.getFieldValue('INPUT_NAME') || 'DO';
                            this.appendStatementInput(inputName);
                        } else if (inputType === 'factory_input_dummy') {
                            this.appendDummyInput();
                        } else if (inputType === 'factory_field_container') {
                            const fieldBlock = inputBlock.getInputTargetBlock('FIELD');
                            if (fieldBlock) {
                                this.appendDummyInput();
                                addFieldToBlock(this, fieldBlock);
                            }
                        }
                        
                        inputBlock = inputBlock.getNextBlock();
                    }

                    // 设置连接
                    if (connectionType === 'statement') {
                        this.setPreviousStatement(true, null);
                        this.setNextStatement(true, null);
                    } else if (connectionType === 'output') {
                        const outType = outputType === 'null' ? null : outputType;
                        this.setOutput(true, outType);
                    }

                    this.setColour(colour);
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

    // 辅助函数：添加字段到积木
    const addFieldToBlock = (block: Blockly.Block, fieldBlock: Blockly.Block) => {
        const fieldType = fieldBlock.type;
        const lastInput = block.inputList[block.inputList.length - 1];
        if (!lastInput) return;

        if (fieldType === 'factory_field_label') {
            const text = fieldBlock.getFieldValue('TEXT') || '标签';
            lastInput.appendField(text);
        } else if (fieldType === 'factory_field_input') {
            const fieldName = fieldBlock.getFieldValue('FIELD_NAME') || 'FIELD';
            const defaultVal = fieldBlock.getFieldValue('DEFAULT') || '';
            lastInput.appendField(new Blockly.FieldTextInput(defaultVal), fieldName);
        } else if (fieldType === 'factory_field_number') {
            const fieldName = fieldBlock.getFieldValue('FIELD_NAME') || 'NUM';
            const defaultVal = Number(fieldBlock.getFieldValue('DEFAULT')) || 0;
            const min = Number(fieldBlock.getFieldValue('MIN')) || -Infinity;
            const max = Number(fieldBlock.getFieldValue('MAX')) || Infinity;
            lastInput.appendField(new Blockly.FieldNumber(defaultVal, min, max), fieldName);
        } else if (fieldType === 'factory_field_dropdown') {
            const fieldName = fieldBlock.getFieldValue('FIELD_NAME') || 'OPTION';
            const options: [string, string][] = [
                [fieldBlock.getFieldValue('OPTION1_TEXT') || '选项A', fieldBlock.getFieldValue('OPTION1_VALUE') || 'A'],
                [fieldBlock.getFieldValue('OPTION2_TEXT') || '选项B', fieldBlock.getFieldValue('OPTION2_VALUE') || 'B'],
                [fieldBlock.getFieldValue('OPTION3_TEXT') || '选项C', fieldBlock.getFieldValue('OPTION3_VALUE') || 'C'],
            ];
            lastInput.appendField(new Blockly.FieldDropdown(options), fieldName);
        } else if (fieldType === 'factory_field_checkbox') {
            const fieldName = fieldBlock.getFieldValue('FIELD_NAME') || 'CHECKED';
            const defaultVal = fieldBlock.getFieldValue('DEFAULT') === 'TRUE' ? 'TRUE' : 'FALSE';
            lastInput.appendField(new Blockly.FieldCheckbox(defaultVal), fieldName);
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

        // 添加默认积木定义
        const rootBlock = workspace.newBlock('factory_block_definition');
        rootBlock.initSvg();
        rootBlock.render();
        rootBlock.moveBy(20, 20);

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

        const blocks = workspaceRef.current.getBlocksByType('factory_block_definition', false);
        if (blocks.length === 0) {
            alert('请先定义一个积木');
            return;
        }

        const savedBlockName = blocks[0].getFieldValue('BLOCK_NAME') || 'custom_block';
        onSaveBlock(blockDefinition, generatorCode, savedBlockName);
        onClose();
    }, [blockDefinition, generatorCode, onSaveBlock, onClose]);

    // 复制到剪贴板
    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('已复制到剪贴板');
        });
    }, []);

    if (!isOpen) return null;

    return (
        <div className="block-factory-overlay" onClick={onClose}>
            <div className="block-factory-content" onClick={(e) => e.stopPropagation()}>
                {/* 标题栏 */}
                <div className="block-factory-header">
                    <h2>🏭 Block Factory - 自定义积木设计器</h2>
                    <button className="block-factory-close" onClick={onClose}>×</button>
                </div>

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
                            <div className="block-factory-code">
                                <pre>{activeTab === 'definition' ? blockDefinition : generatorCode}</pre>
                                <button 
                                    className="copy-btn"
                                    onClick={() => handleCopy(activeTab === 'definition' ? blockDefinition : generatorCode)}
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

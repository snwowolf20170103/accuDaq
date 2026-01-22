/**
 * DAQ 自定义积木块定义
 * 用于 Blockly 编辑器中的 DAQ 专用积木
 */

import * as Blockly from 'blockly';
import { pythonGenerator, Order } from 'blockly/python';

// ============================================
// 积木块定义
// ============================================

/**
 * 读取输入端口积木
 * 用于获取 CustomScript 节点输入端口的值
 */
Blockly.Blocks['daq_read_input'] = {
    init: function (this: Blockly.Block) {
        console.log('Init daq_read_input block');
        this.appendDummyInput()
            .appendField('读取输入')
            .appendField(new Blockly.FieldDropdown([
                ['input1', 'input1'],
                ['input2', 'input2'],
            ]), 'PORT_NAME');
        this.setOutput(true, 'Number');
        this.setColour(230);
        this.setTooltip('读取节点输入端口的值');
        this.setHelpUrl('');
    }
};

/**
 * 设置输出端口积木
 * 用于设置 CustomScript 节点输出端口的值
 */
Blockly.Blocks['daq_set_output'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('设置输出')
            .appendField(new Blockly.FieldDropdown([
                ['output1', 'output1'],
            ]), 'PORT_NAME')
            .appendField('为');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip('设置节点输出端口的值');
        this.setHelpUrl('');
    }
};

// ============================================
// Python 代码生成器
// ============================================

/**
 * 读取输入 - Python 代码生成
 */
pythonGenerator.forBlock['daq_read_input'] = function (
    block: Blockly.Block,
    _generator: typeof pythonGenerator
): [string, Order] {
    const portName = block.getFieldValue('PORT_NAME');
    const code = `get_input("${portName}")`;
    return [code, Order.FUNCTION_CALL];
};

/**
 * 设置输出 - Python 代码生成
 */
pythonGenerator.forBlock['daq_set_output'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
    const portName = block.getFieldValue('PORT_NAME');
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    return `set_output("${portName}", ${value})\n`;
};

// ============================================
// 工具箱配置
// ============================================

export const daqToolboxConfig = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: 'DAQ 专用',
            colour: '#A65C5C',
            contents: [
                { kind: 'block', type: 'daq_read_input' },
                { kind: 'block', type: 'daq_set_output' },
            ]
        },
        {
            kind: 'category',
            name: '逻辑',
            colour: '#5C81A6',
            contents: [
                { kind: 'block', type: 'controls_if' },
                {
                    kind: 'block',
                    type: 'logic_compare',
                    fields: { OP: 'LT' }  // 预设为小于 (<)
                },
                {
                    kind: 'block',
                    type: 'logic_compare',
                    fields: { OP: 'GT' }  // 预设为大于 (>)
                },
                {
                    kind: 'block',
                    type: 'logic_compare',
                    fields: { OP: 'EQ' }  // 预设为等于 (=)
                },
                { kind: 'block', type: 'logic_operation' },
                { kind: 'block', type: 'logic_negate' },
                { kind: 'block', type: 'logic_boolean' },
            ]
        },
        {
            kind: 'category',
            name: '数学',
            colour: '#5CA65C',
            contents: [
                { kind: 'block', type: 'math_number' },
                { kind: 'block', type: 'math_arithmetic' },
                { kind: 'block', type: 'math_single' },
                { kind: 'block', type: 'math_round' },
            ]
        },
    ]
};

/**
 * 初始化 DAQ 积木块
 * 在应用启动时调用此函数注册自定义积木
 */
export function initDaqBlocks(): void {
    // 积木块已在模块加载时自动注册
    console.log('DAQ Blockly blocks initialized');
}

export default { daqToolboxConfig, initDaqBlocks };

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

/**
 * 获取时间戳积木
 * 用于获取当前时间戳（秒级或毫秒级）
 */
Blockly.Blocks['daq_timestamp'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField('获取')
            .appendField(new Blockly.FieldDropdown([
                ['秒级时间戳', 'seconds'],
                ['毫秒级时间戳', 'milliseconds'],
                ['当前时间字符串', 'datetime'],
            ]), 'TIME_TYPE');
        this.setOutput(true, null);
        this.setColour(230);
        this.setTooltip('获取当前时间戳或时间字符串');
        this.setHelpUrl('');
    }
};

/**
 * 数据范围验证积木
 * 检查数值是否在指定范围内
 */
Blockly.Blocks['daq_validate_range'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('验证');
        this.appendValueInput('MIN')
            .setCheck('Number')
            .appendField('是否在范围');
        this.appendValueInput('MAX')
            .setCheck('Number')
            .appendField('到');
        this.appendDummyInput()
            .appendField('之间');
        this.setOutput(true, 'Boolean');
        this.setColour(230);
        this.setTooltip('检查数值是否在指定范围内');
        this.setHelpUrl('');
    }
};

/**
 * 温度单位转换积木
 * 摄氏度、华氏度、开尔文之间转换
 */
Blockly.Blocks['daq_temperature_convert'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('将');
        this.appendDummyInput()
            .appendField('从')
            .appendField(new Blockly.FieldDropdown([
                ['摄氏度', 'celsius'],
                ['华氏度', 'fahrenheit'],
                ['开尔文', 'kelvin'],
            ]), 'FROM_UNIT')
            .appendField('转换为')
            .appendField(new Blockly.FieldDropdown([
                ['摄氏度', 'celsius'],
                ['华氏度', 'fahrenheit'],
                ['开尔文', 'kelvin'],
            ]), 'TO_UNIT');
        this.setOutput(true, 'Number');
        this.setColour(230);
        this.setTooltip('温度单位转换');
        this.setHelpUrl('');
    }
};

/**
 * 移动平均滤波积木
 * 计算最近N个数据点的平均值
 */
Blockly.Blocks['daq_moving_average'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('计算');
        this.appendValueInput('WINDOW_SIZE')
            .setCheck('Number')
            .appendField('的移动平均（窗口大小');
        this.appendDummyInput()
            .appendField('）');
        this.setOutput(true, 'Number');
        this.setColour(230);
        this.setTooltip('计算移动平均值进行数据平滑');
        this.setHelpUrl('');
    }
};

/**
 * 数据变化率积木
 * 计算数据的变化率（导数）
 */
Blockly.Blocks['daq_rate_of_change'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('CURRENT')
            .setCheck('Number')
            .appendField('计算变化率 当前值');
        this.appendValueInput('PREVIOUS')
            .setCheck('Number')
            .appendField('前一值');
        this.appendValueInput('TIME_DIFF')
            .setCheck('Number')
            .appendField('时间间隔');
        this.setOutput(true, 'Number');
        this.setColour(230);
        this.setTooltip('计算数据的变化率（单位/秒）');
        this.setHelpUrl('');
    }
};

// ============================================
// 数据处理积木
// ============================================

/**
 * 数值映射积木
 * 将数值从一个范围映射到另一个范围
 */
Blockly.Blocks['daq_map_value'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('映射');
        this.appendValueInput('IN_MIN')
            .setCheck('Number')
            .appendField('从范围');
        this.appendValueInput('IN_MAX')
            .setCheck('Number')
            .appendField('-');
        this.appendValueInput('OUT_MIN')
            .setCheck('Number')
            .appendField('到范围');
        this.appendValueInput('OUT_MAX')
            .setCheck('Number')
            .appendField('-');
        this.setOutput(true, 'Number');
        this.setColour(230);
        this.setTooltip('将数值从一个范围线性映射到另一个范围');
        this.setHelpUrl('');
    }
};

/**
 * 数值限幅积木
 * 将数值限制在指定范围内
 */
Blockly.Blocks['daq_clamp'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('限幅');
        this.appendValueInput('MIN')
            .setCheck('Number')
            .appendField('最小值');
        this.appendValueInput('MAX')
            .setCheck('Number')
            .appendField('最大值');
        this.setOutput(true, 'Number');
        this.setColour(230);
        this.setTooltip('将数值限制在最小值和最大值之间');
        this.setHelpUrl('');
    }
};

/**
 * 线性插值积木
 */
Blockly.Blocks['daq_lerp'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('A')
            .setCheck('Number')
            .appendField('线性插值 从');
        this.appendValueInput('B')
            .setCheck('Number')
            .appendField('到');
        this.appendValueInput('T')
            .setCheck('Number')
            .appendField('比例');
        this.setOutput(true, 'Number');
        this.setColour(230);
        this.setTooltip('在两个值之间进行线性插值，比例 0-1');
        this.setHelpUrl('');
    }
};

/**
 * 死区处理积木
 */
Blockly.Blocks['daq_deadband'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('死区处理');
        this.appendValueInput('CENTER')
            .setCheck('Number')
            .appendField('中心值');
        this.appendValueInput('BAND')
            .setCheck('Number')
            .appendField('死区宽度');
        this.setOutput(true, 'Number');
        this.setColour(230);
        this.setTooltip('在中心值附近的死区范围内返回中心值');
        this.setHelpUrl('');
    }
};

/**
 * 滞回比较积木
 */
Blockly.Blocks['daq_hysteresis'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('滞回比较');
        this.appendValueInput('LOW_THRESHOLD')
            .setCheck('Number')
            .appendField('低阈值');
        this.appendValueInput('HIGH_THRESHOLD')
            .setCheck('Number')
            .appendField('高阈值');
        this.appendValueInput('CURRENT_STATE')
            .setCheck('Boolean')
            .appendField('当前状态');
        this.setOutput(true, 'Boolean');
        this.setColour(230);
        this.setTooltip('带滞回的阈值比较，避免在临界点抖动');
        this.setHelpUrl('');
    }
};

// ============================================
// 报警控制积木
// ============================================

/**
 * 高限报警积木
 */
Blockly.Blocks['daq_alarm_high'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('高限报警');
        this.appendValueInput('THRESHOLD')
            .setCheck('Number')
            .appendField('阈值');
        this.appendDummyInput()
            .appendField('报警名称')
            .appendField(new Blockly.FieldTextInput('alarm1'), 'ALARM_NAME');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(0);
        this.setTooltip('当值超过阈值时触发高限报警');
        this.setHelpUrl('');
    }
};

/**
 * 低限报警积木
 */
Blockly.Blocks['daq_alarm_low'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('低限报警');
        this.appendValueInput('THRESHOLD')
            .setCheck('Number')
            .appendField('阈值');
        this.appendDummyInput()
            .appendField('报警名称')
            .appendField(new Blockly.FieldTextInput('alarm1'), 'ALARM_NAME');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(0);
        this.setTooltip('当值低于阈值时触发低限报警');
        this.setHelpUrl('');
    }
};

/**
 * 范围报警积木
 */
Blockly.Blocks['daq_alarm_range'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('范围报警');
        this.appendValueInput('LOW')
            .setCheck('Number')
            .appendField('下限');
        this.appendValueInput('HIGH')
            .setCheck('Number')
            .appendField('上限');
        this.appendDummyInput()
            .appendField('报警名称')
            .appendField(new Blockly.FieldTextInput('alarm1'), 'ALARM_NAME');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(0);
        this.setTooltip('当值超出指定范围时触发报警');
        this.setHelpUrl('');
    }
};

/**
 * 变化率报警积木
 */
Blockly.Blocks['daq_alarm_roc'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('CURRENT')
            .setCheck('Number')
            .appendField('变化率报警 当前值');
        this.appendValueInput('PREVIOUS')
            .setCheck('Number')
            .appendField('前一值');
        this.appendValueInput('MAX_RATE')
            .setCheck('Number')
            .appendField('最大变化率');
        this.appendDummyInput()
            .appendField('报警名称')
            .appendField(new Blockly.FieldTextInput('roc_alarm'), 'ALARM_NAME');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(0);
        this.setTooltip('当变化率超过限制时触发报警');
        this.setHelpUrl('');
    }
};

// ============================================
// 日志记录积木
// ============================================

/**
 * 打印日志积木
 */
Blockly.Blocks['daq_log_print'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('MESSAGE')
            .appendField('打印日志')
            .appendField(new Blockly.FieldDropdown([
                ['信息', 'INFO'],
                ['警告', 'WARNING'],
                ['错误', 'ERROR'],
                ['调试', 'DEBUG'],
            ]), 'LEVEL');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip('打印日志消息');
        this.setHelpUrl('');
    }
};

/**
 * 记录数据积木
 */
Blockly.Blocks['daq_log_data'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('记录数据');
        this.appendDummyInput()
            .appendField('标签')
            .appendField(new Blockly.FieldTextInput('data1'), 'TAG');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip('记录数据点到日志');
        this.setHelpUrl('');
    }
};

/**
 * 格式化字符串积木
 */
Blockly.Blocks['daq_format_string'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('格式化数值');
        this.appendDummyInput()
            .appendField('小数位数')
            .appendField(new Blockly.FieldNumber(2, 0, 10, 1), 'DECIMALS')
            .appendField('单位')
            .appendField(new Blockly.FieldTextInput(''), 'UNIT');
        this.setOutput(true, 'String');
        this.setColour(160);
        this.setTooltip('将数值格式化为带单位的字符串');
        this.setHelpUrl('');
    }
};

// ============================================
// 定时器与延时积木
// ============================================

/**
 * 延时积木
 */
Blockly.Blocks['daq_delay'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('DURATION')
            .setCheck('Number')
            .appendField('延时');
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                ['秒', 'seconds'],
                ['毫秒', 'milliseconds'],
            ]), 'UNIT');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
        this.setTooltip('程序暂停指定时间');
        this.setHelpUrl('');
    }
};

/**
 * 计时器开始积木
 */
Blockly.Blocks['daq_timer_start'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField('启动计时器')
            .appendField(new Blockly.FieldTextInput('timer1'), 'TIMER_NAME');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
        this.setTooltip('启动一个命名计时器');
        this.setHelpUrl('');
    }
};

/**
 * 获取计时器时间积木
 */
Blockly.Blocks['daq_timer_elapsed'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField('计时器')
            .appendField(new Blockly.FieldTextInput('timer1'), 'TIMER_NAME')
            .appendField('已过时间')
            .appendField(new Blockly.FieldDropdown([
                ['秒', 'seconds'],
                ['毫秒', 'milliseconds'],
            ]), 'UNIT');
        this.setOutput(true, 'Number');
        this.setColour(120);
        this.setTooltip('获取计时器已经过的时间');
        this.setHelpUrl('');
    }
};

/**
 * 周期执行检查积木
 */
Blockly.Blocks['daq_interval_check'] = {
    init: function (this: Blockly.Block) {
        this.appendValueInput('INTERVAL')
            .setCheck('Number')
            .appendField('每隔');
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                ['秒', 'seconds'],
                ['毫秒', 'milliseconds'],
            ]), 'UNIT')
            .appendField('执行一次？');
        this.setOutput(true, 'Boolean');
        this.setColour(120);
        this.setTooltip('检查是否到达周期执行时间');
        this.setHelpUrl('');
    }
};

// ============================================
// 状态机积木
// ============================================

/**
 * 设置状态积木
 */
Blockly.Blocks['daq_state_set'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField('设置状态')
            .appendField(new Blockly.FieldTextInput('state_var'), 'STATE_NAME')
            .appendField('为')
            .appendField(new Blockly.FieldTextInput('IDLE'), 'STATE_VALUE');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
        this.setTooltip('设置状态机的当前状态');
        this.setHelpUrl('');
    }
};

/**
 * 获取状态积木
 */
Blockly.Blocks['daq_state_get'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField('获取状态')
            .appendField(new Blockly.FieldTextInput('state_var'), 'STATE_NAME');
        this.setOutput(true, 'String');
        this.setColour(290);
        this.setTooltip('获取状态机的当前状态');
        this.setHelpUrl('');
    }
};

/**
 * 状态比较积木
 */
Blockly.Blocks['daq_state_is'] = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput()
            .appendField('状态')
            .appendField(new Blockly.FieldTextInput('state_var'), 'STATE_NAME')
            .appendField('是')
            .appendField(new Blockly.FieldTextInput('IDLE'), 'STATE_VALUE')
            .appendField('?');
        this.setOutput(true, 'Boolean');
        this.setColour(290);
        this.setTooltip('检查状态机是否处于指定状态');
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

/**
 * 获取时间戳 - Python 代码生成
 */
pythonGenerator.forBlock['daq_timestamp'] = function (
    block: Blockly.Block,
    _generator: typeof pythonGenerator
): [string, Order] {
    const timeType = block.getFieldValue('TIME_TYPE');
    let code = '';

    if (timeType === 'seconds') {
        code = 'int(time.time())';
    } else if (timeType === 'milliseconds') {
        code = 'int(time.time() * 1000)';
    } else {
        code = 'datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")';
    }

    return [code, Order.FUNCTION_CALL];
};

/**
 * 数据范围验证 - Python 代码生成
 */
pythonGenerator.forBlock['daq_validate_range'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const value = generator.valueToCode(block, 'VALUE', Order.RELATIONAL) || '0';
    const min = generator.valueToCode(block, 'MIN', Order.RELATIONAL) || '0';
    const max = generator.valueToCode(block, 'MAX', Order.RELATIONAL) || '100';
    const code = `(${min} <= ${value} <= ${max})`;
    return [code, Order.RELATIONAL];
};

/**
 * 温度单位转换 - Python 代码生成
 */
pythonGenerator.forBlock['daq_temperature_convert'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const fromUnit = block.getFieldValue('FROM_UNIT');
    const toUnit = block.getFieldValue('TO_UNIT');

    // 如果单位相同，直接返回
    if (fromUnit === toUnit) {
        return [value, Order.ATOMIC];
    }

    let code = '';

    // 先转换到摄氏度
    if (fromUnit === 'fahrenheit') {
        code = `((${value}) - 32) * 5/9`;
    } else if (fromUnit === 'kelvin') {
        code = `((${value}) - 273.15)`;
    } else {
        code = value;
    }

    // 再从摄氏度转换到目标单位
    if (toUnit === 'fahrenheit') {
        code = `((${code}) * 9/5 + 32)`;
    } else if (toUnit === 'kelvin') {
        code = `((${code}) + 273.15)`;
    }

    return [code, Order.MULTIPLICATIVE];
};

/**
 * 移动平均滤波 - Python 代码生成
 */
pythonGenerator.forBlock['daq_moving_average'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const windowSize = generator.valueToCode(block, 'WINDOW_SIZE', Order.ATOMIC) || '5';

    // 注意：这需要在CustomScript组件中维护一个缓冲区
    const code = `moving_average(${value}, ${windowSize})`;
    return [code, Order.FUNCTION_CALL];
};

/**
 * 数据变化率 - Python 代码生成
 */
pythonGenerator.forBlock['daq_rate_of_change'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const current = generator.valueToCode(block, 'CURRENT', Order.ATOMIC) || '0';
    const previous = generator.valueToCode(block, 'PREVIOUS', Order.ATOMIC) || '0';
    const timeDiff = generator.valueToCode(block, 'TIME_DIFF', Order.ATOMIC) || '1';

    const code = `((${current}) - (${previous})) / (${timeDiff})`;
    return [code, Order.MULTIPLICATIVE];
};

// ============================================
// 数据处理 - Python 代码生成
// ============================================

pythonGenerator.forBlock['daq_map_value'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const inMin = generator.valueToCode(block, 'IN_MIN', Order.ATOMIC) || '0';
    const inMax = generator.valueToCode(block, 'IN_MAX', Order.ATOMIC) || '100';
    const outMin = generator.valueToCode(block, 'OUT_MIN', Order.ATOMIC) || '0';
    const outMax = generator.valueToCode(block, 'OUT_MAX', Order.ATOMIC) || '100';
    const code = `((${value}) - (${inMin})) * ((${outMax}) - (${outMin})) / ((${inMax}) - (${inMin})) + (${outMin})`;
    return [code, Order.MULTIPLICATIVE];
};

pythonGenerator.forBlock['daq_clamp'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const min = generator.valueToCode(block, 'MIN', Order.ATOMIC) || '0';
    const max = generator.valueToCode(block, 'MAX', Order.ATOMIC) || '100';
    const code = `max(${min}, min(${max}, ${value}))`;
    return [code, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['daq_lerp'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const a = generator.valueToCode(block, 'A', Order.ATOMIC) || '0';
    const b = generator.valueToCode(block, 'B', Order.ATOMIC) || '100';
    const t = generator.valueToCode(block, 'T', Order.ATOMIC) || '0.5';
    const code = `(${a}) + ((${b}) - (${a})) * (${t})`;
    return [code, Order.MULTIPLICATIVE];
};

pythonGenerator.forBlock['daq_deadband'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const center = generator.valueToCode(block, 'CENTER', Order.ATOMIC) || '0';
    const band = generator.valueToCode(block, 'BAND', Order.ATOMIC) || '1';
    const code = `(${center} if abs((${value}) - (${center})) < (${band}) else ${value})`;
    return [code, Order.CONDITIONAL];
};

pythonGenerator.forBlock['daq_hysteresis'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const lowThreshold = generator.valueToCode(block, 'LOW_THRESHOLD', Order.ATOMIC) || '0';
    const highThreshold = generator.valueToCode(block, 'HIGH_THRESHOLD', Order.ATOMIC) || '100';
    const currentState = generator.valueToCode(block, 'CURRENT_STATE', Order.ATOMIC) || 'False';
    const code = `(True if (${value}) > (${highThreshold}) else (False if (${value}) < (${lowThreshold}) else ${currentState}))`;
    return [code, Order.CONDITIONAL];
};

// ============================================
// 报警控制 - Python 代码生成
// ============================================

pythonGenerator.forBlock['daq_alarm_high'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const threshold = generator.valueToCode(block, 'THRESHOLD', Order.ATOMIC) || '100';
    const alarmName = block.getFieldValue('ALARM_NAME');
    return `if (${value}) > (${threshold}):\n    trigger_alarm("${alarmName}", "HIGH", ${value}, ${threshold})\n`;
};

pythonGenerator.forBlock['daq_alarm_low'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const threshold = generator.valueToCode(block, 'THRESHOLD', Order.ATOMIC) || '0';
    const alarmName = block.getFieldValue('ALARM_NAME');
    return `if (${value}) < (${threshold}):\n    trigger_alarm("${alarmName}", "LOW", ${value}, ${threshold})\n`;
};

pythonGenerator.forBlock['daq_alarm_range'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const low = generator.valueToCode(block, 'LOW', Order.ATOMIC) || '0';
    const high = generator.valueToCode(block, 'HIGH', Order.ATOMIC) || '100';
    const alarmName = block.getFieldValue('ALARM_NAME');
    return `if (${value}) < (${low}) or (${value}) > (${high}):\n    trigger_alarm("${alarmName}", "RANGE", ${value}, (${low}, ${high}))\n`;
};

pythonGenerator.forBlock['daq_alarm_roc'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
    const current = generator.valueToCode(block, 'CURRENT', Order.ATOMIC) || '0';
    const previous = generator.valueToCode(block, 'PREVIOUS', Order.ATOMIC) || '0';
    const maxRate = generator.valueToCode(block, 'MAX_RATE', Order.ATOMIC) || '10';
    const alarmName = block.getFieldValue('ALARM_NAME');
    return `_roc = abs((${current}) - (${previous}))\nif _roc > (${maxRate}):\n    trigger_alarm("${alarmName}", "ROC", _roc, ${maxRate})\n`;
};

// ============================================
// 日志记录 - Python 代码生成
// ============================================

pythonGenerator.forBlock['daq_log_print'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
    const level = block.getFieldValue('LEVEL');
    const message = generator.valueToCode(block, 'MESSAGE', Order.ATOMIC) || '""';
    return `log_message("${level}", ${message})\n`;
};

pythonGenerator.forBlock['daq_log_data'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const tag = block.getFieldValue('TAG');
    return `log_data("${tag}", ${value})\n`;
};

pythonGenerator.forBlock['daq_format_string'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
    const decimals = block.getFieldValue('DECIMALS');
    const unit = block.getFieldValue('UNIT');
    const code = `f"{${value}:.${decimals}f}${unit}"`;
    return [code, Order.ATOMIC];
};

// ============================================
// 定时器与延时 - Python 代码生成
// ============================================

pythonGenerator.forBlock['daq_delay'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): string {
    const duration = generator.valueToCode(block, 'DURATION', Order.ATOMIC) || '1';
    const unit = block.getFieldValue('UNIT');
    if (unit === 'milliseconds') {
        return `time.sleep((${duration}) / 1000)\n`;
    }
    return `time.sleep(${duration})\n`;
};

pythonGenerator.forBlock['daq_timer_start'] = function (
    block: Blockly.Block,
    _generator: typeof pythonGenerator
): string {
    const timerName = block.getFieldValue('TIMER_NAME');
    return `_timers["${timerName}"] = time.time()\n`;
};

pythonGenerator.forBlock['daq_timer_elapsed'] = function (
    block: Blockly.Block,
    _generator: typeof pythonGenerator
): [string, Order] {
    const timerName = block.getFieldValue('TIMER_NAME');
    const unit = block.getFieldValue('UNIT');
    if (unit === 'milliseconds') {
        return [`(time.time() - _timers.get("${timerName}", time.time())) * 1000`, Order.MULTIPLICATIVE];
    }
    return [`time.time() - _timers.get("${timerName}", time.time())`, Order.ADDITIVE];
};

pythonGenerator.forBlock['daq_interval_check'] = function (
    block: Blockly.Block,
    generator: typeof pythonGenerator
): [string, Order] {
    const interval = generator.valueToCode(block, 'INTERVAL', Order.ATOMIC) || '1';
    const unit = block.getFieldValue('UNIT');
    if (unit === 'milliseconds') {
        return [`check_interval(${interval} / 1000)`, Order.FUNCTION_CALL];
    }
    return [`check_interval(${interval})`, Order.FUNCTION_CALL];
};

// ============================================
// 状态机 - Python 代码生成
// ============================================

pythonGenerator.forBlock['daq_state_set'] = function (
    block: Blockly.Block,
    _generator: typeof pythonGenerator
): string {
    const stateName = block.getFieldValue('STATE_NAME');
    const stateValue = block.getFieldValue('STATE_VALUE');
    return `_states["${stateName}"] = "${stateValue}"\n`;
};

pythonGenerator.forBlock['daq_state_get'] = function (
    block: Blockly.Block,
    _generator: typeof pythonGenerator
): [string, Order] {
    const stateName = block.getFieldValue('STATE_NAME');
    return [`_states.get("${stateName}", "")`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['daq_state_is'] = function (
    block: Blockly.Block,
    _generator: typeof pythonGenerator
): [string, Order] {
    const stateName = block.getFieldValue('STATE_NAME');
    const stateValue = block.getFieldValue('STATE_VALUE');
    return [`_states.get("${stateName}", "") == "${stateValue}"`, Order.RELATIONAL];
};

// ============================================
// 工具箱配置（完整版）
// ============================================

export const daqToolboxConfig = {
    kind: 'categoryToolbox',
    contents: [
        // ============ DAQ 专用积木 ============
        {
            kind: 'category',
            name: 'DAQ 专用',
            colour: '#A65C5C',
            contents: [
                { kind: 'block', type: 'daq_read_input' },
                { kind: 'block', type: 'daq_set_output' },
                { kind: 'block', type: 'daq_timestamp' },
                { kind: 'block', type: 'daq_validate_range' },
                { kind: 'block', type: 'daq_moving_average' },
                { kind: 'block', type: 'daq_rate_of_change' },
                { kind: 'block', type: 'daq_temperature_convert' },
            ]
        },

        // ============ 数据处理积木 ============
        {
            kind: 'category',
            name: '数据处理',
            colour: '#5C81A6',
            contents: [
                { kind: 'block', type: 'daq_map_value' },
                { kind: 'block', type: 'daq_clamp' },
                { kind: 'block', type: 'daq_lerp' },
                { kind: 'block', type: 'daq_deadband' },
                { kind: 'block', type: 'daq_hysteresis' },
            ]
        },

        // ============ 报警控制积木 ============
        {
            kind: 'category',
            name: '报警控制',
            colour: '#E74C3C',
            contents: [
                { kind: 'block', type: 'daq_alarm_high' },
                { kind: 'block', type: 'daq_alarm_low' },
                { kind: 'block', type: 'daq_alarm_range' },
                { kind: 'block', type: 'daq_alarm_roc' },
            ]
        },

        // ============ 日志记录积木 ============
        {
            kind: 'category',
            name: '日志记录',
            colour: '#27AE60',
            contents: [
                { kind: 'block', type: 'daq_log_print' },
                { kind: 'block', type: 'daq_log_data' },
                { kind: 'block', type: 'daq_format_string' },
            ]
        },

        // ============ 定时器积木 ============
        {
            kind: 'category',
            name: '定时器',
            colour: '#F39C12',
            contents: [
                { kind: 'block', type: 'daq_delay' },
                { kind: 'block', type: 'daq_timer_start' },
                { kind: 'block', type: 'daq_timer_elapsed' },
                { kind: 'block', type: 'daq_interval_check' },
            ]
        },

        // ============ 状态机积木 ============
        {
            kind: 'category',
            name: '状态机',
            colour: '#9B59B6',
            contents: [
                { kind: 'block', type: 'daq_state_set' },
                { kind: 'block', type: 'daq_state_get' },
                { kind: 'block', type: 'daq_state_is' },
            ]
        },

        // ============ 逻辑积木 ============
        {
            kind: 'category',
            name: '逻辑',
            colour: '#5C81A6',
            contents: [
                { kind: 'block', type: 'controls_if' },
                { kind: 'block', type: 'logic_compare' },
                { kind: 'block', type: 'logic_operation' },
                { kind: 'block', type: 'logic_negate' },
                { kind: 'block', type: 'logic_boolean' },
                { kind: 'block', type: 'logic_null' },
                { kind: 'block', type: 'logic_ternary' },
            ]
        },

        // ============ 循环积木 ============
        {
            kind: 'category',
            name: '循环',
            colour: '#5CA68D',
            contents: [
                { kind: 'block', type: 'controls_repeat_ext' },
                { kind: 'block', type: 'controls_whileUntil' },
                { kind: 'block', type: 'controls_for' },
                { kind: 'block', type: 'controls_forEach' },
                { kind: 'block', type: 'controls_flow_statements' },
            ]
        },

        // ============ 数学积木 ============
        {
            kind: 'category',
            name: '数学',
            colour: '#5CA65C',
            contents: [
                { kind: 'block', type: 'math_number' },
                { kind: 'block', type: 'math_arithmetic' },
                { kind: 'block', type: 'math_single' },
                { kind: 'block', type: 'math_trig' },
                { kind: 'block', type: 'math_constant' },
                { kind: 'block', type: 'math_number_property' },
                { kind: 'block', type: 'math_round' },
                { kind: 'block', type: 'math_on_list' },
                { kind: 'block', type: 'math_modulo' },
                { kind: 'block', type: 'math_constrain' },
                { kind: 'block', type: 'math_random_int' },
                { kind: 'block', type: 'math_random_float' },
            ]
        },

        // ============ 文本积木 ============
        {
            kind: 'category',
            name: '文本',
            colour: '#5BA58C',
            contents: [
                { kind: 'block', type: 'text' },
                { kind: 'block', type: 'text_join' },
                { kind: 'block', type: 'text_append' },
                { kind: 'block', type: 'text_length' },
                { kind: 'block', type: 'text_isEmpty' },
                { kind: 'block', type: 'text_indexOf' },
                { kind: 'block', type: 'text_charAt' },
                { kind: 'block', type: 'text_getSubstring' },
                { kind: 'block', type: 'text_changeCase' },
                { kind: 'block', type: 'text_trim' },
                { kind: 'block', type: 'text_print' },
            ]
        },

        // ============ 列表积木 ============
        {
            kind: 'category',
            name: '列表',
            colour: '#745CA6',
            contents: [
                { kind: 'block', type: 'lists_create_with' },
                { kind: 'block', type: 'lists_create_empty' },
                { kind: 'block', type: 'lists_repeat' },
                { kind: 'block', type: 'lists_length' },
                { kind: 'block', type: 'lists_isEmpty' },
                { kind: 'block', type: 'lists_indexOf' },
                { kind: 'block', type: 'lists_getIndex' },
                { kind: 'block', type: 'lists_setIndex' },
                { kind: 'block', type: 'lists_getSublist' },
                { kind: 'block', type: 'lists_split' },
                { kind: 'block', type: 'lists_sort' },
            ]
        },

        // ============ 变量积木 ============
        {
            kind: 'category',
            name: '变量',
            colour: '#A65C81',
            custom: 'VARIABLE'
        },

        // ============ 函数积木 ============
        {
            kind: 'category',
            name: '函数',
            colour: '#9A5CA6',
            custom: 'PROCEDURE'
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

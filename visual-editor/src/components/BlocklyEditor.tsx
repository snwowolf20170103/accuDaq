/**
 * Blockly 编辑器组件
 * 用于 CustomScript 节点的可视化逻辑编辑
 */

import { useEffect, useRef, useCallback } from 'react';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import 'blockly/blocks';
import { daqToolboxConfig, initDaqBlocks } from '../blocks/daqBlocks';

// 初始化 DAQ 积木块
initDaqBlocks();

interface BlocklyEditorProps {
    /** 初始 XML 状态（用于恢复之前的积木） */
    initialXml?: string;
    /** 代码变更回调 */
    onCodeChange?: (code: string, xml: string) => void;
    /** 编辑器宽度 */
    width?: string | number;
    /** 编辑器高度 */
    height?: string | number;
}

const BlocklyEditor = ({
    initialXml,
    onCodeChange,
    width = '100%',
    height = '100%',
}: BlocklyEditorProps) => {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

    // 生成代码并通知父组件
    const generateCode = useCallback(() => {
        if (!workspaceRef.current || !onCodeChange) return;

        try {
            // 生成 Python 代码
            const code = pythonGenerator.workspaceToCode(workspaceRef.current);

            // 序列化 XML 用于保存状态
            const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef.current);
            const xmlText = Blockly.Xml.domToText(xmlDom);

            onCodeChange(code, xmlText);
        } catch (error) {
            console.error('Error generating code:', error);
        }
    }, [onCodeChange]);

    // 初始化 Blockly 工作区
    useEffect(() => {
        if (!blocklyDiv.current) return;

        // 创建工作区
        const workspace = Blockly.inject(blocklyDiv.current, {
            toolbox: daqToolboxConfig,
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
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2,
            },
            trashcan: true,
            move: {
                scrollbars: true,
                drag: true,
                wheel: true,
            },
        } as Blockly.BlocklyOptions);

        workspaceRef.current = workspace;

        // NOTE: 在 Blockly v12+ 中，VARIABLE 和 PROCEDURE 类别由 Blockly 内部自动注册
        // 不需要手动调用 registerToolboxCategoryCallback
        // 手动注册会导致冲突，破坏类别切换功能


        // 恢复之前的积木状态
        if (initialXml) {
            try {
                const xmlDom = Blockly.utils.xml.textToDom(initialXml);
                Blockly.Xml.domToWorkspace(xmlDom, workspace);
            } catch (error) {
                console.error('Error loading initial XML:', error);
            }
        }


        // 自定义工具箱颜色样式 - 使用 CSS 变量而非直接修改 DOM
        // 注意：直接修改 DOM 会干扰 Blockly 的点击事件处理
        // 导致 "Cannot read properties of null (reading 'isSelectable')" 错误
        // 工具箱颜色由 daqToolboxConfig 中的 colour 属性控制

        const resizeWorkspace = () => {
            if (workspaceRef.current) {
                Blockly.svgResize(workspaceRef.current);
            }
        };

        resizeWorkspace();

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                resizeWorkspace();
            });
            resizeObserver.observe(blocklyDiv.current);
        } else {
            window.addEventListener('resize', resizeWorkspace);
        }

        // 监听工作区变化
        workspace.addChangeListener((event: Blockly.Events.Abstract) => {
            // 忽略 UI 事件，只响应积木变化
            if (
                event.type === Blockly.Events.BLOCK_CHANGE ||
                event.type === Blockly.Events.BLOCK_CREATE ||
                event.type === Blockly.Events.BLOCK_DELETE ||
                event.type === Blockly.Events.BLOCK_MOVE
            ) {
                generateCode();
            }
        });

        // 初始生成一次代码
        generateCode();

        // 延迟调用 resize 确保工具箱正确显示
        const resizeTimer = setTimeout(() => {
            resizeWorkspace();
        }, 100);

        // 再次延迟 resize（确保弹窗动画完成后）
        const resizeTimer2 = setTimeout(() => {
            resizeWorkspace();
        }, 300);

        // 清理
        return () => {
            clearTimeout(resizeTimer);
            clearTimeout(resizeTimer2);
            resizeObserver?.disconnect();
            if (resizeObserver === null) {
                window.removeEventListener('resize', resizeWorkspace);
            }
            workspace.dispose();
            workspaceRef.current = null;
        };
    }, [initialXml, generateCode]);

    // 处理尺寸变化
    useEffect(() => {
        if (workspaceRef.current) {
            Blockly.svgResize(workspaceRef.current);
        }
    }, [width, height]);

    return (
        <div
            ref={blocklyDiv}
            style={{
                width,
                height,
                minHeight: 400,
            }}
        />
    );
};

export default BlocklyEditor;

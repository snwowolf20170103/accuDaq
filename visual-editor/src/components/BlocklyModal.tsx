/**
 * Blockly 弹窗编辑器
 * 用于在模态框中展示 Blockly 编辑器
 */

import { useState, useCallback } from 'react';
import BlocklyEditor from './BlocklyEditor';
import BlockFactory from './BlockFactory';
import './BlocklyModal.css';

interface BlocklyModalProps {
    /** 是否显示弹窗 */
    isOpen: boolean;
    /** 关闭弹窗回调 */
    onClose: () => void;
    /** 保存回调，返回生成的代码和 XML */
    onSave: (code: string, xml: string) => void;
    /** 初始 XML 状态 */
    initialXml?: string;
    /** 节点名称（用于显示标题） */
    nodeName?: string;
}

const BlocklyModal = ({
    isOpen,
    onClose,
    onSave,
    initialXml = '',
    nodeName = 'Custom Script',
}: BlocklyModalProps) => {
    const [currentCode, setCurrentCode] = useState('');
    const [currentXml, setCurrentXml] = useState(initialXml);
    const [isFactoryOpen, setIsFactoryOpen] = useState(false);

    // 处理代码变更
    const handleCodeChange = useCallback((code: string, xml: string) => {
        setCurrentCode(code);
        setCurrentXml(xml);
    }, []);

    // 处理 Block Factory 保存
    const handleFactorySave = useCallback((blockDef: string, generatorCode: string, blockName: string) => {
        console.log('New custom block created:', blockName);
        console.log('Block Definition:', blockDef);
        console.log('Generator Code:', generatorCode);
        // TODO: 动态注册新积木到工作区
        alert(`积木 "${blockName}" 已创建！\n\n代码已输出到控制台，请将其添加到 daqBlocks.ts 中。`);
    }, []);

    // 处理保存
    const handleSave = useCallback(() => {
        onSave(currentCode, currentXml);
        onClose();
    }, [currentCode, currentXml, onSave, onClose]);

    // 处理取消
    const handleCancel = useCallback(() => {
        onClose();
    }, [onClose]);

    // 阻止点击内容区域时关闭弹窗
    const handleContentClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    if (!isOpen) return null;

    return (
        <div className="blockly-modal-overlay" onClick={handleCancel}>
            <div className="blockly-modal-content" onClick={handleContentClick}>
                {/* 标题栏 */}
                <div className="blockly-modal-header">
                    <h2>🧩 编辑逻辑 - {nodeName}</h2>
                    <button className="blockly-modal-close" onClick={handleCancel}>
                        ×
                    </button>
                </div>

                {/* 编辑器区域 */}
                <div className="blockly-modal-body">
                    <div className="blockly-editor-container">
                        <BlocklyEditor
                            initialXml={initialXml}
                            onCodeChange={handleCodeChange}
                            width="100%"
                            height="100%"
                        />
                    </div>

                    {/* 代码预览 */}
                    <div className="blockly-code-preview">
                        <h3>生成的 Python 代码：</h3>
                        <pre>{currentCode || '// 拖拽积木块来生成代码'}</pre>
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="blockly-modal-footer">
                    <button 
                        className="blockly-btn blockly-btn-factory" 
                        onClick={() => setIsFactoryOpen(true)}
                    >
                        🏭 Block Factory
                    </button>
                    <div className="blockly-footer-spacer" />
                    <button className="blockly-btn blockly-btn-cancel" onClick={handleCancel}>
                        取消
                    </button>
                    <button className="blockly-btn blockly-btn-save" onClick={handleSave}>
                        保存
                    </button>
                </div>
            </div>

            {/* Block Factory 弹窗 */}
            <BlockFactory
                isOpen={isFactoryOpen}
                onClose={() => setIsFactoryOpen(false)}
                onSaveBlock={handleFactorySave}
            />
        </div>
    );
};

export default BlocklyModal;

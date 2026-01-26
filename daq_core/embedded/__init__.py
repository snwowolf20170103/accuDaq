# 嵌入式支持模块
# 包含 LVGL 集成、交叉编译、FPGA 支持

from .lvgl_integration import LVGLIntegration, lvgl_integration
from .cross_compile import (
    CrossCompiler, 
    TargetPlatform, 
    ToolchainConfig,
    get_available_platforms,
    create_cross_compiler
)
from .fpga_support import (
    FPGADriver,
    SimulatedFPGADriver,
    PCIeFPGADriver,
    FPGAInterface,
    FPGARegister
)

__all__ = [
    # LVGL
    "LVGLIntegration",
    "lvgl_integration",
    # Cross Compile
    "CrossCompiler",
    "TargetPlatform",
    "ToolchainConfig",
    "get_available_platforms",
    "create_cross_compiler",
    # FPGA
    "FPGADriver",
    "SimulatedFPGADriver",
    "PCIeFPGADriver",
    "FPGAInterface",
    "FPGARegister",
]

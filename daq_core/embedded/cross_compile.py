"""
交叉编译支持模块
支持 ARM、RISC-V、ESP32 等嵌入式平台
"""

import os
import subprocess
import shutil
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class TargetPlatform(Enum):
    """目标平台枚举"""
    ARM_CORTEX_M4 = "arm-cortex-m4"
    ARM_CORTEX_M7 = "arm-cortex-m7"
    ARM_CORTEX_A53 = "arm-cortex-a53"
    RISCV32 = "riscv32"
    RISCV64 = "riscv64"
    ESP32 = "esp32"
    ESP32_S3 = "esp32-s3"
    STM32F4 = "stm32f4"
    STM32H7 = "stm32h7"
    RASPBERRY_PI = "raspberry-pi"
    LINUX_X86_64 = "linux-x86_64"
    WINDOWS_X86_64 = "windows-x86_64"


@dataclass
class ToolchainConfig:
    """工具链配置"""
    name: str
    cc: str  # C 编译器
    cxx: str  # C++ 编译器
    ar: str  # 归档工具
    objcopy: str  # 对象拷贝工具
    size: str  # 大小工具
    prefix: str  # 工具链前缀
    cflags: List[str]
    ldflags: List[str]
    includes: List[str]
    libs: List[str]
    

# 预定义工具链配置
TOOLCHAIN_CONFIGS: Dict[TargetPlatform, ToolchainConfig] = {
    TargetPlatform.ARM_CORTEX_M4: ToolchainConfig(
        name="ARM Cortex-M4",
        cc="arm-none-eabi-gcc",
        cxx="arm-none-eabi-g++",
        ar="arm-none-eabi-ar",
        objcopy="arm-none-eabi-objcopy",
        size="arm-none-eabi-size",
        prefix="arm-none-eabi-",
        cflags=["-mcpu=cortex-m4", "-mthumb", "-mfloat-abi=hard", "-mfpu=fpv4-sp-d16", "-Os"],
        ldflags=["-mcpu=cortex-m4", "-mthumb", "-specs=nano.specs", "-specs=nosys.specs"],
        includes=[],
        libs=["c", "m", "nosys"]
    ),
    TargetPlatform.ARM_CORTEX_M7: ToolchainConfig(
        name="ARM Cortex-M7",
        cc="arm-none-eabi-gcc",
        cxx="arm-none-eabi-g++",
        ar="arm-none-eabi-ar",
        objcopy="arm-none-eabi-objcopy",
        size="arm-none-eabi-size",
        prefix="arm-none-eabi-",
        cflags=["-mcpu=cortex-m7", "-mthumb", "-mfloat-abi=hard", "-mfpu=fpv5-d16", "-Os"],
        ldflags=["-mcpu=cortex-m7", "-mthumb", "-specs=nano.specs", "-specs=nosys.specs"],
        includes=[],
        libs=["c", "m", "nosys"]
    ),
    TargetPlatform.STM32F4: ToolchainConfig(
        name="STM32F4",
        cc="arm-none-eabi-gcc",
        cxx="arm-none-eabi-g++",
        ar="arm-none-eabi-ar",
        objcopy="arm-none-eabi-objcopy",
        size="arm-none-eabi-size",
        prefix="arm-none-eabi-",
        cflags=["-mcpu=cortex-m4", "-mthumb", "-mfloat-abi=hard", "-mfpu=fpv4-sp-d16", 
                "-DSTM32F4", "-Os", "-ffunction-sections", "-fdata-sections"],
        ldflags=["-mcpu=cortex-m4", "-mthumb", "-Wl,--gc-sections"],
        includes=[],
        libs=["c", "m"]
    ),
    TargetPlatform.STM32H7: ToolchainConfig(
        name="STM32H7",
        cc="arm-none-eabi-gcc",
        cxx="arm-none-eabi-g++",
        ar="arm-none-eabi-ar",
        objcopy="arm-none-eabi-objcopy",
        size="arm-none-eabi-size",
        prefix="arm-none-eabi-",
        cflags=["-mcpu=cortex-m7", "-mthumb", "-mfloat-abi=hard", "-mfpu=fpv5-d16",
                "-DSTM32H7", "-Os", "-ffunction-sections", "-fdata-sections"],
        ldflags=["-mcpu=cortex-m7", "-mthumb", "-Wl,--gc-sections"],
        includes=[],
        libs=["c", "m"]
    ),
    TargetPlatform.ESP32: ToolchainConfig(
        name="ESP32",
        cc="xtensa-esp32-elf-gcc",
        cxx="xtensa-esp32-elf-g++",
        ar="xtensa-esp32-elf-ar",
        objcopy="xtensa-esp32-elf-objcopy",
        size="xtensa-esp32-elf-size",
        prefix="xtensa-esp32-elf-",
        cflags=["-mlongcalls", "-Os"],
        ldflags=["-mlongcalls"],
        includes=[],
        libs=[]
    ),
    TargetPlatform.ESP32_S3: ToolchainConfig(
        name="ESP32-S3",
        cc="xtensa-esp32s3-elf-gcc",
        cxx="xtensa-esp32s3-elf-g++",
        ar="xtensa-esp32s3-elf-ar",
        objcopy="xtensa-esp32s3-elf-objcopy",
        size="xtensa-esp32s3-elf-size",
        prefix="xtensa-esp32s3-elf-",
        cflags=["-mlongcalls", "-Os"],
        ldflags=["-mlongcalls"],
        includes=[],
        libs=[]
    ),
    TargetPlatform.RISCV32: ToolchainConfig(
        name="RISC-V 32-bit",
        cc="riscv32-unknown-elf-gcc",
        cxx="riscv32-unknown-elf-g++",
        ar="riscv32-unknown-elf-ar",
        objcopy="riscv32-unknown-elf-objcopy",
        size="riscv32-unknown-elf-size",
        prefix="riscv32-unknown-elf-",
        cflags=["-march=rv32imc", "-mabi=ilp32", "-Os"],
        ldflags=["-march=rv32imc", "-mabi=ilp32"],
        includes=[],
        libs=["c", "m"]
    ),
    TargetPlatform.RASPBERRY_PI: ToolchainConfig(
        name="Raspberry Pi",
        cc="aarch64-linux-gnu-gcc",
        cxx="aarch64-linux-gnu-g++",
        ar="aarch64-linux-gnu-ar",
        objcopy="aarch64-linux-gnu-objcopy",
        size="aarch64-linux-gnu-size",
        prefix="aarch64-linux-gnu-",
        cflags=["-mcpu=cortex-a53", "-O2"],
        ldflags=["-mcpu=cortex-a53"],
        includes=[],
        libs=["c", "m", "pthread"]
    ),
}


class CrossCompiler:
    """
    交叉编译器类
    管理不同目标平台的编译过程
    """
    
    def __init__(self, target: TargetPlatform, toolchain_path: Optional[str] = None):
        """
        初始化交叉编译器
        
        Args:
            target: 目标平台
            toolchain_path: 工具链路径（可选）
        """
        self.target = target
        self.toolchain_path = Path(toolchain_path) if toolchain_path else None
        
        if target not in TOOLCHAIN_CONFIGS:
            raise ValueError(f"Unsupported target platform: {target}")
        
        self.config = TOOLCHAIN_CONFIGS[target]
        
    def check_toolchain(self) -> bool:
        """检查工具链是否可用"""
        cc = self.config.cc
        if self.toolchain_path:
            cc = str(self.toolchain_path / "bin" / cc)
        
        try:
            result = subprocess.run([cc, "--version"], 
                                  capture_output=True, 
                                  text=True,
                                  timeout=10)
            if result.returncode == 0:
                logger.info(f"Toolchain found: {self.config.name}")
                logger.debug(result.stdout.split('\n')[0])
                return True
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
        
        logger.warning(f"Toolchain not found: {self.config.cc}")
        return False
    
    def get_compiler_command(self) -> str:
        """获取编译器命令"""
        cc = self.config.cc
        if self.toolchain_path:
            cc = str(self.toolchain_path / "bin" / cc)
        return cc
    
    def compile_file(self, source: str, output: str, 
                    extra_cflags: List[str] = None,
                    extra_includes: List[str] = None) -> bool:
        """
        编译单个文件
        
        Args:
            source: 源文件路径
            output: 输出文件路径
            extra_cflags: 额外的编译标志
            extra_includes: 额外的包含路径
            
        Returns:
            编译是否成功
        """
        cc = self.get_compiler_command()
        
        cmd = [cc, "-c", source, "-o", output]
        cmd.extend(self.config.cflags)
        
        if extra_cflags:
            cmd.extend(extra_cflags)
        
        for inc in self.config.includes:
            cmd.extend(["-I", inc])
        
        if extra_includes:
            for inc in extra_includes:
                cmd.extend(["-I", inc])
        
        logger.info(f"Compiling: {source}")
        logger.debug(f"Command: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                logger.error(f"Compilation failed:\n{result.stderr}")
                return False
            return True
        except subprocess.SubprocessError as e:
            logger.error(f"Compilation error: {e}")
            return False
    
    def link(self, objects: List[str], output: str,
            extra_ldflags: List[str] = None,
            linker_script: Optional[str] = None) -> bool:
        """
        链接目标文件
        
        Args:
            objects: 目标文件列表
            output: 输出文件路径
            extra_ldflags: 额外的链接标志
            linker_script: 链接脚本路径
            
        Returns:
            链接是否成功
        """
        cc = self.get_compiler_command()
        
        cmd = [cc]
        cmd.extend(objects)
        cmd.extend(["-o", output])
        cmd.extend(self.config.ldflags)
        
        if extra_ldflags:
            cmd.extend(extra_ldflags)
        
        if linker_script:
            cmd.extend(["-T", linker_script])
        
        for lib in self.config.libs:
            cmd.extend(["-l", lib])
        
        logger.info(f"Linking: {output}")
        logger.debug(f"Command: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                logger.error(f"Linking failed:\n{result.stderr}")
                return False
            return True
        except subprocess.SubprocessError as e:
            logger.error(f"Linking error: {e}")
            return False
    
    def generate_binary(self, elf_file: str, output_format: str = "bin") -> Optional[str]:
        """
        从 ELF 文件生成二进制文件
        
        Args:
            elf_file: ELF 文件路径
            output_format: 输出格式 (bin, hex, srec)
            
        Returns:
            输出文件路径
        """
        objcopy = self.config.objcopy
        if self.toolchain_path:
            objcopy = str(self.toolchain_path / "bin" / objcopy)
        
        output_file = Path(elf_file).with_suffix(f".{output_format}")
        
        format_flags = {
            "bin": "-O binary",
            "hex": "-O ihex",
            "srec": "-O srec",
        }
        
        if output_format not in format_flags:
            logger.error(f"Unknown output format: {output_format}")
            return None
        
        cmd = f"{objcopy} {format_flags[output_format]} {elf_file} {output_file}"
        
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"Binary generation failed:\n{result.stderr}")
                return None
            
            logger.info(f"Generated: {output_file}")
            return str(output_file)
        except subprocess.SubprocessError as e:
            logger.error(f"Binary generation error: {e}")
            return None
    
    def get_size_info(self, elf_file: str) -> Optional[Dict]:
        """
        获取程序大小信息
        
        Returns:
            包含 text, data, bss 大小的字典
        """
        size_cmd = self.config.size
        if self.toolchain_path:
            size_cmd = str(self.toolchain_path / "bin" / size_cmd)
        
        try:
            result = subprocess.run([size_cmd, elf_file], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if len(lines) >= 2:
                    values = lines[1].split()
                    return {
                        "text": int(values[0]),
                        "data": int(values[1]),
                        "bss": int(values[2]),
                        "total": int(values[3]) if len(values) > 3 else sum(int(v) for v in values[:3])
                    }
        except (subprocess.SubprocessError, ValueError, IndexError) as e:
            logger.error(f"Size info error: {e}")
        
        return None
    
    def generate_cmake_toolchain(self, output_path: str) -> str:
        """
        生成 CMake 工具链文件
        
        Args:
            output_path: 输出文件路径
            
        Returns:
            工具链文件路径
        """
        content = f"""# CMake Toolchain File for {self.config.name}
# Generated by accuDaq Cross Compiler

set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR {self.target.value.split('-')[0]})

# Toolchain prefix
set(TOOLCHAIN_PREFIX "{self.config.prefix}")

# Compilers
set(CMAKE_C_COMPILER ${{TOOLCHAIN_PREFIX}}gcc)
set(CMAKE_CXX_COMPILER ${{TOOLCHAIN_PREFIX}}g++)
set(CMAKE_ASM_COMPILER ${{TOOLCHAIN_PREFIX}}gcc)
set(CMAKE_AR ${{TOOLCHAIN_PREFIX}}ar)
set(CMAKE_OBJCOPY ${{TOOLCHAIN_PREFIX}}objcopy)
set(CMAKE_OBJDUMP ${{TOOLCHAIN_PREFIX}}objdump)
set(CMAKE_SIZE ${{TOOLCHAIN_PREFIX}}size)

# Compiler flags
set(CMAKE_C_FLAGS "{' '.join(self.config.cflags)}")
set(CMAKE_CXX_FLAGS "{' '.join(self.config.cflags)}")
set(CMAKE_EXE_LINKER_FLAGS "{' '.join(self.config.ldflags)}")

# Search paths
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
"""
        
        output_path = Path(output_path)
        output_path.write_text(content, encoding='utf-8')
        logger.info(f"Generated CMake toolchain file: {output_path}")
        return str(output_path)


def get_available_platforms() -> List[Dict]:
    """获取可用的目标平台列表"""
    platforms = []
    for platform in TargetPlatform:
        config = TOOLCHAIN_CONFIGS.get(platform)
        if config:
            platforms.append({
                "id": platform.value,
                "name": config.name,
                "compiler": config.cc,
            })
    return platforms


def create_cross_compiler(platform_id: str, 
                         toolchain_path: Optional[str] = None) -> CrossCompiler:
    """
    创建交叉编译器实例
    
    Args:
        platform_id: 平台 ID
        toolchain_path: 工具链路径
        
    Returns:
        CrossCompiler 实例
    """
    platform = TargetPlatform(platform_id)
    return CrossCompiler(platform, toolchain_path)

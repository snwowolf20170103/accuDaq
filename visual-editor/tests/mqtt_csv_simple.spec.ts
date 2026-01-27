import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('AccuDaq MQTT + CSV Workflow', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(180000); // Increase timeout for real backend wait
        await page.goto('http://localhost:3000/');
        await expect(page.locator('.canvas-wrapper')).toBeVisible();
    });

    test('should complete the full MQTT to CSV and Dashboard visualization flow', async ({ page }) => {
        // --- 1. Setup Visual Flow ---
        const library = page.locator('.component-library');
        await expect(library).toBeVisible();

        const pane = page.locator('.react-flow__pane');

        // 1. Drag Mock Device (Default visible in 'Devices' category)
        const mockDevice = library.locator('.component-item:has-text("Mock Device")');
        if (!(await mockDevice.isVisible())) {
            await library.locator('.category-title:has-text("Devices")').click();
        }
        await mockDevice.dragTo(pane, { targetPosition: { x: 200, y: 150 } });

        // 2. Drag CSV Storage (Need to expand 'Storage' category)
        const storageHeader = library.locator('.category-title:has-text("Storage")');
        await storageHeader.click();

        const csvStorage = library.locator('.component-item:has-text("CSV Storage")');
        await csvStorage.waitFor({ state: 'visible', timeout: 2000 });
        await csvStorage.dragTo(pane, { targetPosition: { x: 500, y: 150 } });

        // --- 1.5 Wiring Nodes ---
        const sourceNode = page.locator('.react-flow__node:has-text("Mock Device")').last();
        const sourceHandle = sourceNode.locator('.react-flow__handle-right').nth(1); // Data port

        const targetNode = page.locator('.react-flow__node:has-text("CSV Storage")').last();
        const targetHandle = targetNode.locator('.react-flow__handle-left').first(); // Data port

        await sourceHandle.hover();
        await page.mouse.down();
        await targetHandle.hover();
        await page.mouse.up();

        await expect(page.locator('.react-flow__edge')).toBeVisible();

        // --- 2. Configure Mock Device Topic ---
        await sourceNode.click();
        await expect(page.locator('.property-panel .panel-header h3')).toContainText('Mock Device');
        // Property panel inputs: 0=ID, 1=Type, 2=device_name, 3=broker_host, 4=broker_port, 5=topic
        const topicInput = page.locator('.property-panel input').nth(5);
        await topicInput.fill('accudaq/demo/sensor');
        await topicInput.press('Enter');

        // --- 3. Configure CSV Storage file path ---
        await targetNode.click();
        await expect(page.locator('.property-panel .panel-header h3')).toContainText('CSV Storage', { timeout: 5000 });

        console.log('Configuring CSV file path...');
        // File Path is the first input in Configuration group (after ID and Type which are readonly)
        const filePathInput = page.locator('.property-panel .property-input').nth(2);
        await filePathInput.fill('./data/test_mqtt_output.csv');
        await filePathInput.press('Enter');
        await page.waitForTimeout(500); // Wait for property update

        // --- 4. Compile and Run ---
        console.log('Compiling project...');
        await page.getByRole('button', { name: /Compile/i }).click();
        await expect(page.locator('text=Compilation successful!')).toBeVisible({ timeout: 15000 });

        console.log('Starting engine...');
        await page.getByRole('button', { name: /RUN/i }).click();

        // Wait briefly and verify Dashboard appears (RUN switches to dashboard)
        await expect(page.locator('.dashboard-designer')).toBeVisible({ timeout: 10000 });

        // --- 4.5. Configure Dashboard Widget ---
        console.log('Configuring Dashboard line chart widget...');

        // Add line chart widget
        const lineChartBtn = page.locator('.widget-toolbar-item:has-text("折线图")');
        await lineChartBtn.click();

        // Wait for widget to appear
        const chartWidget = page.locator('.dashboard-grid-container .dashboard-widget-container:has-text("折线图")').first();
        await expect(chartWidget).toBeVisible({ timeout: 5000 });

        // Click widget to configure
        await chartWidget.click();
        await page.waitForTimeout(500);

        // Configure data binding in property panel
        const propertyPanel = page.locator('.property-panel');
        await expect(propertyPanel).toBeVisible();

        // Set binding type to "设备变量" (device)
        const bindingTypeSelect = propertyPanel.locator('select').first();
        await bindingTypeSelect.selectOption('device');
        await page.waitForTimeout(300);

        // Set MQTT topic
        const mqttTopicInput = propertyPanel.locator('input[placeholder*="sensors/"]').first();
        await mqttTopicInput.fill('accudaq/demo/sensor');
        await mqttTopicInput.press('Enter');

        console.log('Dashboard widget configured, waiting for data...');

        // Wait for data to be generated and displayed
        await page.waitForTimeout(8000);

        // --- 5. Verify CSV Download ---
        await page.getByRole('button', { name: 'Visual' }).click();
        await expect(page.locator('.react-flow__pane')).toBeVisible();

        const downloadBtn = page.locator('button:has-text("Download CSV")');
        await expect(downloadBtn).toBeVisible();

        // Disable File System Access API to force fallback download
        await page.evaluate(() => {
            // @ts-ignore
            window.showSaveFilePicker = undefined;
        });

        const downloadPromise = page.waitForEvent('download');
        await downloadBtn.click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe('test_mqtt_output.csv');

        // Verify file on disk
        const absolutePath = path.resolve(process.cwd(), '../data/test_mqtt_output.csv');
        console.log(`Checking file at: ${absolutePath}`);

        if (fs.existsSync(absolutePath)) {
            const stats = fs.statSync(absolutePath);
            console.log(`Generated CSV size: ${stats.size} bytes`);
            // File should have at least SOME content (header + data)
            expect(stats.size).toBeGreaterThan(0);
        } else {
            throw new Error(`Backend file not found on disk at ${absolutePath}`);
        }

        // --- 6. Stop Engine ---
        console.log('Stopping engine...');
        const stopBtn = page.locator('button:has-text("STOP")');
        await expect(stopBtn).toBeVisible({ timeout: 5000 });
        await stopBtn.click();
        await page.waitForTimeout(2000);

        // Verify engine stopped (button should change back to RUN)
        await expect(page.locator('button:has-text("RUN")')).toBeVisible({ timeout: 5000 });
        console.log('Engine stopped. Test completed successfully!');
    });
});

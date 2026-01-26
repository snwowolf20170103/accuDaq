import { test, expect } from '@playwright/test';

test.describe('AccuDaq MQTT + CSV Workflow', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        await page.goto('http://localhost:3000/');
        await expect(page.locator('.canvas-wrapper')).toBeVisible();
    });

    test('should complete the full MQTT to CSV and Dashboard visualization flow', async ({ page }) => {
        // --- 1. Setup Visual Flow ---
        const library = page.locator('.component-library');
        await expect(library).toBeVisible();

        const mockDevice = library.locator('.component-item:has-text("Mock Device")');
        const csvStorage = library.locator('.component-item:has-text("CSV Storage")');
        const pane = page.locator('.react-flow__pane');

        // Drag components to canvas
        await mockDevice.dragTo(pane, { targetPosition: { x: 200, y: 150 } });
        await csvStorage.dragTo(pane, { targetPosition: { x: 500, y: 150 } });

        // --- 1.5 Wiring Nodes ---
        // Locate output handle of Mock Device (Data port)
        const sourceNode = page.locator('.react-flow__node:has-text("Mock Device")').last();
        const sourceHandle = sourceNode.locator('.react-flow__handle-right').nth(1); // 0 is Value, 1 is Data

        // Locate input handle of CSV Storage (Data port)
        const targetNode = page.locator('.react-flow__node:has-text("CSV Storage")').last();
        const targetHandle = targetNode.locator('.react-flow__handle-left').first(); // 0 is Data

        // Perform wiring
        await sourceHandle.hover();
        await page.mouse.down();
        await targetHandle.hover();
        await page.mouse.up();

        // Verify connection exists (React Flow edges use .react-flow__edge)
        await expect(page.locator('.react-flow__edge')).toBeVisible();

        // --- 2. Configure Topic ---
        await sourceNode.click();
        const topicInput = page.locator('.property-panel input').nth(3);
        await topicInput.fill('accudaq/demo/sensor');
        await topicInput.press('Enter');

        // --- 3. Switch to Dashboard ---
        const dashboardTab = page.getByRole('button', { name: 'Dashboard' });
        await dashboardTab.click();
        await expect(page.locator('.dashboard-designer')).toBeVisible();

        // --- 4. Add and Configure Line Chart ---
        const chartToolbarBtn = page.locator('.widget-toolbar-item:has-text("折线图")');
        await chartToolbarBtn.click();

        const gridWidget = page.locator('.dashboard-grid-container .dashboard-widget-container:has-text("折线图")').first();
        await expect(gridWidget).toBeVisible({ timeout: 10000 });

        await gridWidget.click();

        // Configure Binding
        const propertyPanel = page.locator('.property-panel');
        await expect(propertyPanel).toBeVisible();

        const bindingTypeSelect = propertyPanel.locator('select').first();
        await bindingTypeSelect.selectOption('device');

        const mqttTopicInput = propertyPanel.locator('input[placeholder*="sensors/"]').first();
        await mqttTopicInput.fill('accudaq/demo/sensor');
        await mqttTopicInput.press('Enter');

        // --- 5. Compile and Run ---
        await page.getByRole('button', { name: 'Visual' }).click();

        await page.route('**/api/compile', async (route) => {
            await route.fulfill({ status: 200, body: 'Success' });
        });
        await page.getByRole('button', { name: /Compile/i }).click();
        await expect(page.locator('text=Compilation successful!')).toBeVisible();

        await page.route('**/api/engine/start', async (route) => {
            await route.fulfill({ status: 200, json: { status: 'started' } });
        });
        await page.getByRole('button', { name: /RUN/i }).click();

        // Verify Dashboard visibility
        await expect(page.locator('.dashboard-designer')).toBeVisible();

        // --- 6. Verify CSV Download ---
        await page.getByRole('button', { name: 'Visual' }).click();

        await page.route('**/api/download-csv**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/csv',
                body: 'timestamp,value\n1627384950,25.5\n1627384951,26.1'
            });
        });

        const downloadBtn = page.locator('button:has-text("Download CSV")');
        await expect(downloadBtn).toBeVisible();

        const downloadPromise = page.waitForEvent('download');
        await downloadBtn.click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toBe('mqtt_data.csv');
    });
});

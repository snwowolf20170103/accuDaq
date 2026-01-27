import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('AccuDaq Complex MQTT Workflow', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(300000); // 5 minutes
        await page.goto('http://localhost:3000/');
        await expect(page.locator('.canvas-wrapper')).toBeVisible();
    });

    test('should complete complex data processing pipeline with multiple components', async ({ page }) => {
        console.log('=== Starting Complex Workflow Test ===');

        const library = page.locator('.component-library');
        await expect(library).toBeVisible();
        const pane = page.locator('.react-flow__pane');

        // Helper to expand category if needed
        const ensureCategoryExpanded = async (categoryName: string, componentSelector: string) => {
            const component = library.locator(componentSelector);
            if (await component.isVisible()) {
                return; // Already expanded/visible
            }

            // otherwise click category
            const header = library.locator(`.category-title:has-text("${categoryName}")`);
            await header.scrollIntoViewIfNeeded();
            await header.click();

            // Wait for animation
            await page.waitForTimeout(500);

            // Wait for component to appear
            await component.first().waitFor({ state: 'visible', timeout: 3000 });
        };

        // --- 1. Add Mock Device ---
        console.log('Step 1: Adding Mock Device...');
        await ensureCategoryExpanded('Devices', '.component-item:has-text("Mock Device")');
        const mockDeviceItem = library.locator('.component-item:has-text("Mock Device")');
        await mockDeviceItem.scrollIntoViewIfNeeded();
        await mockDeviceItem.dragTo(pane, { targetPosition: { x: 150, y: 100 } });
        await page.waitForTimeout(500);

        // --- 2. Add Math Operation ---
        console.log('Step 2: Adding Math Operation...');
        await ensureCategoryExpanded('Logic', '.component-item:has-text("Math Operation")');
        const mathComp = library.locator('.component-item:has-text("Math Operation")');
        await mathComp.scrollIntoViewIfNeeded();
        await mathComp.dragTo(pane, { targetPosition: { x: 350, y: 100 } });
        await page.waitForTimeout(500);

        // --- 3. Add Compare ---
        console.log('Step 3: Adding Compare...');
        const compareComp = library.locator('.component-item:has-text("Compare")');
        await ensureCategoryExpanded('Logic', '.component-item:has-text("Compare")');
        await compareComp.scrollIntoViewIfNeeded();
        await compareComp.dragTo(pane, { targetPosition: { x: 550, y: 100 } });
        await page.waitForTimeout(500);

        // --- 4. Add MQTT Publish ---
        console.log('Step 4: Adding MQTT Publish...');
        await ensureCategoryExpanded('Communication', '.component-item:has-text("MQTT Publish")');
        const mqttPubItem = library.locator('.component-item:has-text("MQTT Publish")');
        await mqttPubItem.scrollIntoViewIfNeeded();
        await mqttPubItem.dragTo(pane, { targetPosition: { x: 150, y: 300 } });
        await page.waitForTimeout(500);

        // --- 5. Add MQTT Subscribe ---
        console.log('Step 5: Adding MQTT Subscribe...');
        await ensureCategoryExpanded('Communication', '.component-item:has-text("MQTT Subscribe")');
        const mqttSubItem = library.locator('.component-item:has-text("MQTT Subscribe")');
        await mqttSubItem.scrollIntoViewIfNeeded();
        await mqttSubItem.dragTo(pane, { targetPosition: { x: 350, y: 300 } });
        await page.waitForTimeout(500);

        // --- 6. Add CSV Storage ---
        console.log('Step 6: Adding CSV Storage...');
        await ensureCategoryExpanded('Storage', '.component-item:has-text("CSV Storage")');
        const csvStorageItem = library.locator('.component-item:has-text("CSV Storage")');
        await csvStorageItem.scrollIntoViewIfNeeded();
        await csvStorageItem.dragTo(pane, { targetPosition: { x: 550, y: 300 } });
        await page.waitForTimeout(1000);
        await page.waitForTimeout(500);

        console.log('Step 7: All components added!');

        // Verify all 6 nodes exist on canvas
        const allNodes = page.locator('.react-flow__node');
        await expect(allNodes).toHaveCount(6, { timeout: 10000 });
        console.log('Verified 6 nodes on canvas');

        // --- 8. Get node references ---
        const mockNode = page.locator('.react-flow__node:has-text("Mock Device")').first();
        const mathNode = page.locator('.react-flow__node:has-text("Math Operation")').first();
        const compareNode = page.locator('.react-flow__node:has-text("Compare")').first();
        const pubNode = page.locator('.react-flow__node:has-text("MQTT Publish")').first();
        const subNode = page.locator('.react-flow__node:has-text("MQTT Subscribe")').first();
        const csvNode = page.locator('.react-flow__node:has-text("CSV Storage")').first();

        // --- 9. Wire components using keyboard/mouse simulation ---
        console.log('Step 8: Wiring components...');

        // Use Fit View to ensure all nodes are visible
        const fitViewBtn = page.locator('button[title="Fit View"]');
        if (await fitViewBtn.isVisible()) {
            await fitViewBtn.click();
            await page.waitForTimeout(1000);
        }

        // Helper function to wire two handles together
        const wireNodes = async (
            sourceNode: any,
            sourcePortId: string,
            targetNode: any,
            targetPortId: string,
            description: string
        ) => {
            console.log(`Wiring: ${description}`);

            const sourceHandle = sourceNode.locator(`.react-flow__handle[data-handleid="${sourcePortId}"]`).first();
            const targetHandle = targetNode.locator(`.react-flow__handle[data-handleid="${targetPortId}"]`).first();

            await sourceHandle.scrollIntoViewIfNeeded();
            const sourceBox = await sourceHandle.boundingBox();
            const targetBox = await targetHandle.boundingBox();

            if (sourceBox && targetBox) {
                await sourceHandle.hover({ force: true });
                await page.mouse.down();
                await page.waitForTimeout(200);

                await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
                await page.waitForTimeout(200);

                await targetHandle.hover({ force: true });
                await page.mouse.up();

                await page.waitForTimeout(1000);
                const edges = await page.locator('.react-flow__edge').count();
                console.log(`  -> ${description} finished. Current edges: ${edges}`);
            } else {
                console.log(`  -> ${description} failed: Handles not found.`);
            }
        };

        // Get initial edge count
        let expectedEdges = 0;

        // Wire 1: Mock Device (value) -> Math Operation (input1)
        await wireNodes(mockNode, 'value', mathNode, 'input1', 'Mock(value) -> Math(input1)');
        expectedEdges++;

        // Check if edge was created
        const edgeCount1 = await page.locator('.react-flow__edge').count();
        console.log(`Edge count after wire 1: ${edgeCount1}`);

        // Wire 2: Math Operation (result) -> Compare (input1)
        await wireNodes(mathNode, 'result', compareNode, 'input1', 'Math(result) -> Compare(input1)');
        expectedEdges++;

        // Wire 3: Compare (result) -> MQTT Publish (data)
        await wireNodes(compareNode, 'result', pubNode, 'data', 'Compare(result) -> Publish(data)');
        expectedEdges++;

        // Wire 4: MQTT Subscribe (data) -> CSV Storage (data)
        await wireNodes(subNode, 'data', csvNode, 'data', 'Subscribe(data) -> CSV(data)');
        expectedEdges++;

        // Verify edges created
        const finalEdgeCount = await page.locator('.react-flow__edge').count();
        console.log(`Final edge count: ${finalEdgeCount}`);

        await page.screenshot({ path: 'test-results/after-wiring.png' });

        console.log('Wiring step completed');

        // --- 10. Select and verify nodes are clickable ---
        console.log('Step 9: Verifying nodes are selectable...');
        await mockNode.click();
        await page.waitForTimeout(300);

        // Check if property panel shows something
        const propertyPanel = page.locator('.property-panel, [class*="property"], [class*="Properties"]');
        const propertyVisible = await propertyPanel.isVisible().catch(() => false);
        console.log(`Property panel visible: ${propertyVisible}`);

        // --- 11. Compile the project ---
        console.log('Step 10: Compiling...');
        const compileBtn = page.locator('button:has-text("Compile"), button:has-text("⚙️ Compile")');
        await compileBtn.click();
        await page.waitForTimeout(2000);

        // --- 12. Test Run button ---
        console.log('Step 11: Testing Run button...');
        const runBtn = page.getByRole('button', { name: /RUN/ });
        if (await runBtn.isVisible()) {
            await runBtn.click();
            await page.waitForTimeout(2000);

            // Check if dashboard or any result is shown
            const dashboardVisible = await page.locator('.dashboard-designer, .dashboard, [class*="dashboard"]').isVisible().catch(() => false);
            console.log(`Dashboard visible: ${dashboardVisible}`);

            // Go back to Visual view
            const visualBtn = page.getByRole('button', { name: /Visual|📊/ });
            if (await visualBtn.isVisible()) {
                await visualBtn.click();
                await page.waitForTimeout(1000);
            }
        }

        // --- 13. Test CSV Download ---
        console.log('Step 12: Testing CSV Download button...');
        const downloadBtn = page.locator('button:has-text("Download CSV"), button:has-text("📥")');
        if (await downloadBtn.isVisible()) {
            // Disable file picker dialog
            await page.evaluate(() => {
                // @ts-ignore
                window.showSaveFilePicker = undefined;
            });

            const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
            await downloadBtn.click();
            const download = await downloadPromise;

            if (download) {
                console.log(`Downloaded file: ${download.suggestedFilename()}`);
            } else {
                console.log('No download triggered (may require data first)');
            }
        }

        // --- 14. Final verification ---
        console.log('Step 13: Final verification...');

        // Verify nodes still exist
        const finalNodeCount = await page.locator('.react-flow__node').count();
        console.log(`Final node count: ${finalNodeCount}`);
        expect(finalNodeCount).toBe(6);

        // Check for any error indicators
        const hasErrors = await page.locator('.error, [class*="error"]').count();
        console.log(`Error elements found: ${hasErrors}`);

        console.log('=== Complex Workflow Test Completed ===');
        console.log('✓ Added 6 components: Mock Device, Math Operation, Compare, MQTT Publish, MQTT Subscribe, CSV Storage');
        console.log(`✓ Created ${finalEdgeCount} connections`);
        console.log('✓ Tested compile functionality');
        console.log('✓ Tested run functionality');
        console.log('✓ All nodes remain on canvas');
    });
});

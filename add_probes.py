import json
import uuid
import os
import glob

# Find all Test*.daq and other .daq files in test directory
test_dir = r"f:\workspaces2025\accuDaq\test"
PROJECT_FILES = glob.glob(os.path.join(test_dir, "Test*.daq"))
PROJECT_FILES.append(os.path.join(test_dir, "mqtt_csv.daq"))

def add_probe(project, edge_to_replace_id, label="Probe"):
    # Find the edge
    wires = project['logic']['wires']
    edge = next((w for w in wires if w['id'] == edge_to_replace_id), None)
    if not edge:
        print(f"Edge {edge_to_replace_id} not found")
        return False

    nodes = project['logic']['nodes']
    source_node = next((n for n in nodes if n['id'] == edge['source']['nodeId']), None)
    target_node = next((n for n in nodes if n['id'] == edge['target']['nodeId']), None)

    if not source_node or not target_node:
        print("Source or target node not found")
        return False

    # Create Probe Node
    probe_id = str(uuid.uuid4())
    probe_x = (source_node['position']['x'] + target_node['position']['x']) / 2
    probe_y = (source_node['position']['y'] + target_node['position']['y']) / 2
    
    probe_node = {
        "id": probe_id,
        "type": "daq:data_probe",
        "label": label,
        "position": {"x": probe_x, "y": probe_y},
        "properties": {
            "label": label,
            "probe_id": probe_id
        }
    }
    
    # Create new wires
    wire1 = {
        "id": str(uuid.uuid4()),
        "source": {"nodeId": edge['source']['nodeId'], "portId": edge['source']['portId']},
        "target": {"nodeId": probe_id, "portId": "input"}
    }
    
    wire2 = {
        "id": str(uuid.uuid4()),
        "source": {"nodeId": probe_id, "portId": "output"},
        "target": {"nodeId": edge['target']['nodeId'], "portId": edge['target']['portId']}
    }
    
    # Update project
    project['logic']['nodes'].append(probe_node)
    project['logic']['wires'] = [w for w in wires if w['id'] != edge_to_replace_id]
    project['logic']['wires'].append(wire1)
    project['logic']['wires'].append(wire2)
    
    print(f"Inserted probe {probe_id} ({label}) between {source_node['label']} and {target_node['label']}")
    return True

def process_file(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Processing {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            project = json.load(f)
            
        # Strategy: Insert probe after the first main component (Mock Device) if possible
        wires = project['logic'].get('wires', [])
        nodes = project['logic'].get('nodes', [])
        
        # Find connection from Mock Device
        mock_devices = [n for n in nodes if 'mock_device' in n['type']]
        modified = False
        
        if mock_devices:
            for dev in mock_devices:
                # Find outgoing wire
                outgoing = [w for w in wires if w['source']['nodeId'] == dev['id']]
                for wire in outgoing:
                    # Avoid double probing if re-running script (simplistic check)
                    target_node = next((n for n in nodes if n['id'] == wire['target']['nodeId']), None)
                    if target_node and 'data_probe' not in target_node['type']:
                         if add_probe(project, wire['id'], label=f"Probe-{dev['label']}"):
                            modified = True
                            # Only probe one connection per device for now to avoid clutter
                            break
                            
        # If no mock device, try to find Math or anything else
        if not modified:
             # Find any connection that is not loopback and insert one
             for wire in wires:
                 source_node = next((n for n in nodes if n['id'] == wire['source']['nodeId']), None)
                 target_node = next((n for n in nodes if n['id'] == wire['target']['nodeId']), None)
                 
                 if source_node and target_node and \
                    'data_probe' not in source_node['type'] and \
                    'data_probe' not in target_node['type']:
                     if add_probe(project, wire['id'], label="DebugProbe"):
                         modified = True
                         break

        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(project, f, indent=4)
            print("Saved changes.")
        else:
            print("No suitable place found or already probed.")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

for fp in PROJECT_FILES:
    process_file(fp)

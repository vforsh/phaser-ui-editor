import { Paper, ScrollArea, Stack } from '@mantine/core';
import { PanelTitle } from './../PanelTitle';
import AssetTreeItem from './AssetTreeItem';
import AssetContextMenu from './AssetContextMenu';
import { useState, useEffect } from 'react';
import type { AssetTreeItemData } from '../../types/assets';

interface ContextMenuState {
  opened: boolean;
  position: { x: number; y: number };
  item: AssetTreeItemData | null;
}

interface AssetsPanelProps {
  onSelectAsset: (item: AssetTreeItemData | null) => void;
  assets: AssetTreeItemData[];
}

export default function AssetsPanel({
  onSelectAsset,
  assets,
}: AssetsPanelProps) {
  const [selectedItem, setSelectedItem] = useState<AssetTreeItemData | null>(
    null
  );
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    opened: false,
    position: { x: 0, y: 0 },
    item: null,
  });

  // Initialize all folders as open
  useEffect(() => {
    const folders = new Set<string>();
    const collectFolderPaths = (items: AssetTreeItemData[]) => {
      items.forEach((item) => {
        if (item.type === 'folder') {
          folders.add(item.path);
          collectFolderPaths(item.children);
        }
      });
    };
    collectFolderPaths(assets);
    setOpenFolders(folders);
  }, [assets]);

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (item: AssetTreeItemData) => {
    setSelectedItem(item);
    onSelectAsset(item);
  };

  const handleContextMenu = (
    item: AssetTreeItemData,
    position: { x: number; y: number }
  ) => {
    setContextMenu({
      opened: true,
      position,
      item,
    });
  };

  const handleContextAction = (action: string) => {
    if (!contextMenu.item) return;

    switch (action) {
      case 'open':
        console.log('Open:', contextMenu.item.name);
        break;
      case 'openInFiles':
        console.log('Open in files:', contextMenu.item.name);
        break;
      case 'rename':
        console.log('Rename:', contextMenu.item.name);
        break;
      case 'delete':
        console.log('Delete:', contextMenu.item.name);
        break;
    }
    setContextMenu({ ...contextMenu, opened: false });
  };

  useEffect(() => {
    const onClick = () => {
      if (contextMenu.opened) {
        setContextMenu({ ...contextMenu, opened: false });
      }
    };

    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [contextMenu.opened]);

  return (
    <Paper
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      radius="sm"
    >
      <Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
        <PanelTitle title="Assets" />
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={0}>
            {assets.map((asset, index) => (
              <AssetTreeItem
                key={asset.path}
                item={asset}
                onToggle={toggleFolder}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
                selectedItem={selectedItem}
                isLastChild={index === assets.length - 1}
                isOpen={openFolders.has(asset.path)}
                openFolders={openFolders}
              />
            ))}
          </Stack>
        </ScrollArea>
      </Stack>

      <AssetContextMenu
        item={contextMenu.item}
        opened={contextMenu.opened}
        position={contextMenu.position}
        onClose={() => setContextMenu({ ...contextMenu, opened: false })}
        onAction={handleContextAction}
      />
    </Paper>
  );
}

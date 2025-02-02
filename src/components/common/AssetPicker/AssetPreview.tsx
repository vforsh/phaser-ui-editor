import { Box, Image } from '@mantine/core'
import { File, FileJson, FileSpreadsheet, FileType, Image as ImageIcon } from 'lucide-react'
import { match } from 'ts-pattern'
import { useEffect, useState } from 'react'
import { AssetTreeItemData, GraphicAssetData, isGraphicAsset } from '../../../types/assets'
import { fetchImageUrl } from '../../../types/assets'

interface AssetPreviewProps {
    asset: AssetTreeItemData
}

export function AssetPreview({ asset }: AssetPreviewProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null)

    /* useEffect(() => {
        if (!isGraphicAsset(asset)) return

        const ac = new AbortController()
        fetchImageUrl(asset, ac.signal).then(url => setImageUrl(url))
        return () => ac.abort()
    }, [asset]) */

    if (isGraphicAsset(asset)) {
        /* if (imageUrl) {
            return (
                <Box style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                        src={imageUrl}
                        alt={asset.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                </Box>
            )
        } */
        return <ImageIcon size={16} />
    }

    return match(asset)
        .with({ type: 'folder' }, () => <File size={16} />)
        .with({ type: 'file' }, () => <File size={16} />)
        .with({ type: 'json' }, () => <FileJson size={16} />)
        .with({ type: 'xml' }, () => <FileSpreadsheet size={16} />)
        .with({ type: 'prefab' }, () => <File size={16} />)
        .with({ type: 'web-font' }, () => <FileType size={16} />)
        .with({ type: 'spritesheet-folder' }, () => <File size={16} />)
        .exhaustive()
} 
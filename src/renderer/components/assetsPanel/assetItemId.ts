/**
 * Creates the id (for the DOM element) of the asset item element.
 *
 * Kept in a separate module so component files can remain
 * "only export React components" for React Fast Refresh.
 */
export function getAssetItemId(assetId: string) {
	return `asset-item-${assetId}`
}

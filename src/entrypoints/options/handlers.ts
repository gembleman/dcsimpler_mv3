import { bindConfigFileHandlers } from './handlers/config-file';
import { bindImageUploadHandlers } from './handlers/image-upload';
import { bindMenuHandlers } from './handlers/navigation';
import type { BindOptionHandlersOptions } from './handlers/shared';
import { bindStatsHandlers } from './handlers/stats';
import {
    bindBlacklistHandlers,
    bindBlacklistScopeHandlers,
    bindConfigToggleHandlers,
    bindMinimizeLayoutHandlers,
    bindTextFileHandlers,
    bindUserMemoHandlers,
} from './handlers/text-settings';

export function bindOptionHandlers(options: BindOptionHandlersOptions): void {
    bindMenuHandlers();
    bindMinimizeLayoutHandlers(options.config, options.saveCurrentConfig);
    bindBlacklistHandlers(options.config, options.saveCurrentConfig, options.visitedGalleries);
    bindBlacklistScopeHandlers(options.config, options.saveCurrentConfig, options.visitedGalleries);
    bindUserMemoHandlers(options.config, options.saveCurrentConfig);
    bindTextFileHandlers();
    bindConfigFileHandlers(options.config, options.saveCurrentConfig, options.visitedGalleries);
    bindConfigToggleHandlers(options.config, options.saveCurrentConfig);
    bindImageUploadHandlers();
    bindStatsHandlers(options.charts);
}

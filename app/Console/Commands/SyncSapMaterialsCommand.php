<?php

namespace App\Console\Commands;

use App\Services\SapMaterialSyncService;
use Illuminate\Console\Command;

class SyncSapMaterialsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sap:sync-materials {--configure-only : Only configure Meilisearch index settings without fetching materials}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync ~15,000 materials from SAP S/4HANA Cloud OData API directly into Meilisearch index (sap_materials) and local zero-SQL cache';

    /**
     * Execute the console command.
     */
    public function handle(SapMaterialSyncService $syncService): int
    {
        $this->info('====================================================');
        $this->info('  SAP S/4HANA Cloud Material Master Direct Sync');
        $this->info('  (Zero-SQL Database Storage Architecture)');
        $this->info('====================================================');

        $isHealthy = $syncService->isMeilisearchHealthy();
        if ($isHealthy) {
            $this->info('✔ Meilisearch instance detected and available on configured host.');
            $this->line('Configuring sap_materials index settings...');
            $syncService->configureIndexSettings();
            $this->info('✔ Index settings configured (searchable, filterable, ranking rules).');
        } else {
            $this->warn('⚠ Meilisearch instance not reachable at configured host.');
            $this->line('  Materials will be synced and indexed directly into local zero-SQL cache.');
            $this->line('  Once Meilisearch is started, rerun this command to populate Meilisearch index.');
        }

        if ($this->option('configure-only')) {
            return Command::SUCCESS;
        }

        $this->newLine();
        $this->info('Starting paginated fetch from SAP S/4HANA Cloud OData API...');

        $result = $syncService->sync(function (string $message) {
            $this->line("  [SAP Sync] {$message}");
        });

        $this->newLine();
        if ($result['success']) {
            $this->info("✔ Successfully synced {$result['total_synced']} materials in {$result['duration_ms']}ms.");
            if ($result['meilisearch_available']) {
                $this->info("  Pushed {$result['meilisearch_pushed']} documents directly to Meilisearch [sap_materials].");
            }
            if ($result['cached_locally']) {
                $this->info("  Saved high-speed zero-SQL index to storage/app/sap_materials_index.json.");
            }
            return Command::SUCCESS;
        }

        $this->error('Failed to sync materials from SAP S/4HANA Cloud API. Check SAP credentials and connectivity.');
        return Command::FAILURE;
    }
}

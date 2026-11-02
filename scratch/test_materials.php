<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$svc = new App\Services\SapMasterDataService();
$res = $svc->fetchMaterialsFromCdsView();

echo "Success: " . ($res['success'] ? 'true' : 'false') . "\n";
echo "Count: " . count($res['items'] ?? []) . "\n";
if (!empty($res['items'])) {
    echo "First 5 items:\n";
    for ($i = 0; $i < min(5, count($res['items'])); $i++) {
        $it = $res['items'][$i];
        echo "[$i] Product: '{$it['Product']}', ProductName: '{$it['ProductName']}', name: '{$it['name']}', ProductDesc: '{$it['ProductDescription']}', raw: " . json_encode(array_slice($it['raw_data'] ?? [], 0, 5)) . "\n";
    }
}


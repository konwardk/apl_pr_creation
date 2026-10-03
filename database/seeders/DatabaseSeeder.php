<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Dipankar Paul',
                'password' => bcrypt('password'),
                'email_verified_at' => now(),
            ]
        );

        $this->call(PurchaseRequisitionSeeder::class);
    }
}

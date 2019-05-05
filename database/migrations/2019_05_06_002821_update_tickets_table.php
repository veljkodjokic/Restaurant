<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class UpdateTicketsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('tickets', function($table)
        {
            $table->unsignedBigInteger('portion_id');
            $table->foreign('portion_id')->references('id')->on('portions');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('tickets', function($table)
        {
            $table->dropForeign(['portion_id']);
            $table->dropColumn('portion_id');
        });
    }
}

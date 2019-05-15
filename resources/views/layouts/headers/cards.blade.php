<div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
    <div class="container-fluid">
        <div class="header-body">
            <!-- Card stats -->
            <?php
                $invoicesThisMonth=App\Invoice::whereMonth('updated_at','=',\Carbon\Carbon::today()->month)->get();
                $invoicesLastMonth=App\Invoice::whereMonth('updated_at','=',\Carbon\Carbon::today()->month-1)->get();
                $grossThisMonth=0;
                $grossLastMonth=0;
                foreach ($invoicesThisMonth as $invoice){
                    $grossThisMonth+=$invoice->amount;
                }
                foreach ($invoicesLastMonth as $invoice){
                    $grossLastMonth+=$invoice->amount;
                }

                $ticketsThisMonth=App\Ticket::whereMonth('updated_at','=',\Carbon\Carbon::today()->month)->get();
                $ticketsLastMonth=App\Ticket::whereMonth('updated_at','=',\Carbon\Carbon::today()->month-1)->get();
                $ticketsThis=0;
                $ticketsLast=0;
                foreach ($ticketsThisMonth as $ticket){
                    $ticketsThis+=$ticket->quantity;
                }
                foreach ($ticketsLastMonth as $ticket){
                    $ticketsLast+=$ticket->quantity;
                }

                $invoicesThisMonth=App\Invoice::whereMonth('updated_at','=',\Carbon\Carbon::today()->month)->where('status',1)->count();
                $invoicesLastMonth=App\Invoice::whereMonth('updated_at','=',\Carbon\Carbon::today()->month-1)->where('status',1)->count();
            ?>
            <div class="row">
                <div class="col-xl-3 col-lg-6">
                    <div class="card card-stats mb-4 mb-xl-0">
                        <div class="card-body">
                            <div class="row">
                                <div class="col">
                                    <h5 class="card-title text-uppercase text-muted mb-0">Monthly Income</h5>
                                    <span class="h2 font-weight-bold mb-0">{{ $grossThisMonth }}</span>
                                </div>
                                <div class="col-auto">
                                    <div class="icon icon-shape bg-danger text-white rounded-circle shadow">
                                        <i class="fas fa-chart-bar"></i>
                                    </div>
                                </div>
                            </div>
                            <p class="mt-3 mb-0 text-muted text-sm">
                                <span class="text-nowrap">Last month: {{ $grossLastMonth }}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-lg-6">
                    <div class="card card-stats mb-4 mb-xl-0">
                        <div class="card-body">
                            <div class="row">
                                <div class="col">
                                    <h5 class="card-title text-uppercase text-muted mb-0">Portions sold</h5>
                                    <span class="h2 font-weight-bold mb-0">{{ $ticketsThis }}</span>
                                </div>
                                <div class="col-auto">
                                    <div class="icon icon-shape bg-warning text-white rounded-circle shadow">
                                        <i class="fas fa-chart-pie"></i>
                                    </div>
                                </div>
                            </div>
                            <p class="mt-3 mb-0 text-muted text-sm">
                                <span class="text-nowrap">Last month: {{ $ticketsLast }}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-lg-6">
                    <div class="card card-stats mb-4 mb-xl-0">
                        <div class="card-body">
                            <div class="row">
                                <div class="col">
                                    <h5 class="card-title text-uppercase text-muted mb-0">Sales</h5>
                                    <span class="h2 font-weight-bold mb-0">{{ $invoicesThisMonth }}</span>
                                </div>
                                <div class="col-auto">
                                    <div class="icon icon-shape bg-yellow text-white rounded-circle shadow">
                                        <i class="fas fa-users"></i>
                                    </div>
                                </div>
                            </div>
                            <p class="mt-3 mb-0 text-muted text-sm">
                                <span class="text-nowrap">Last month: {{ $invoicesLastMonth }}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
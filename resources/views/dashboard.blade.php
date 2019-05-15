@extends('layouts.app')

@section('content')
    <div class="header bg-gradient-primary pb-8 pt-5 pt-md-8">
        <div class="container-fluid">
            <div class="header-body" >
                <a class="h4 mb-0 text-white text-uppercase d-none d-lg-inline-block dash-below" href="{{ route('home') }}">{{ __('Dashboard') }}</a>
                <div class="row" id="row">
                    <!-- Card stats -->
                    @foreach($categories as $category)

                        <div class="col-xl-3 col-lg-6">
                            <div class="card card-stats mb-4 mb-xl-3 breath pointer">
                                <a href="{{ url('/categories/'.$category->name) }}">
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col">
                                            <span class="h2 font-weight-bold mb-0">{{ $category->name }}</span>
                                        </div>
                                        <div class="col-auto">
                                            @if($category->name=="Appetizers")
                                                <div class="icon icon-shape bg-orange text-white rounded-circle shadow">
                                                    <i class="fas fa-cookie-bite"></i>
                                                </div>
                                            @elseif($category->name=="Entrees")
                                                <div class="icon icon-shape bg-danger text-white rounded-circle shadow">
                                                    <i class="fas fa-pizza-slice"></i>
                                                </div>
                                            @elseif($category->name=="Drinks")
                                                <div class="icon icon-shape bg-blue text-white rounded-circle shadow">
                                                    <i class="fas fa-wine-glass-alt"></i>
                                                </div>
                                            @elseif($category->name=="Desserts")
                                                <div class="icon icon-shape bg-pink text-white rounded-circle shadow">
                                                    <i class="fas fa-ice-cream"></i>
                                                </div>
                                            @else
                                                <div class="icon icon-shape bg-red text-white rounded-circle shadow">
                                                    <i class="far fa-question-circle"></i>
                                                </div>
                                            @endif
                                        </div>
                                    </div>
                                    <p class="mt-3 mb-0 text-muted text-sm">
                                        <span class="text-success mr-2"><i class="fas fa-concierge-bell"></i> {{ $category->goods()->distinct('name')->count('name') }}</span>
                                        <span class="text-nowrap">Goods count</span>
                                    </p>
                                </div>
                                </a>
                            </div>
                        </div>
                    @endforeach


                </div>
            </div>
        </div>
    </div>
    
    <div class="container-fluid mt--7">
            <div class="row">
                <div class="col-xl-8 mb-5 mb-xl-0">

                </div>
                <div class="col-xl-4">

                </div>
            </div>
            <div class="row mt-5">

            </div>
            <script>
                var timer;
                function up()
                {
                    timer = setTimeout(function()
                    {
                        var keywords = $('#search_bar').val();
                        $.post('/search-category', {keywords: keywords}, function(data)
                        {
                            $('#row').html(data);
                        });
                    }, 500);
                }
                function down()
                {
                    clearTimeout(timer);
                }
            </script>

        @include('layouts.footers.auth')
    </div>
@endsection

@push('js')
    <script src="{{ asset('argon') }}/vendor/chart.js/dist/Chart.min.js"></script>
    <script src="{{ asset('argon') }}/vendor/chart.js/dist/Chart.extension.js"></script>
@endpush
<?php

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Authentication Routes...
Auth::routes();



//Auth users only
Route::group(['middleware' => 'auth'], function () {
	Route::resource('user', 'UserController', ['except' => ['show']]);
	Route::get('profile', ['as' => 'profile.edit', 'uses' => 'ProfileController@edit']);
	Route::put('profile', ['as' => 'profile.update', 'uses' => 'ProfileController@update']);
	Route::put('profile/password', ['as' => 'profile.password', 'uses' => 'ProfileController@password']);
    Route::get('activity', 'ProfileController@getActivity')->name('activity');

    Route::get('/', 'HomeController@index')->name('home');
    Route::get('/home', 'HomeController@index')->name('home');

    Route::get('/categories/{name}','HomeController@getCategory');

    Route::get('/activity','HomeController@getActivity');

    Route::post('/open-ticket', 'TicketController@openNew');
    Route::post('/save-ticket', 'TicketController@saveTicket');
    Route::post('/add-portion', 'TicketController@addPortion');
    Route::post('/delete-ticket', 'TicketController@deleteTicket');
    Route::post('/delete-invoice', 'TicketController@deleteInvoice');

    Route::post('/search-category', 'HomeController@searchCategory');
    Route::post('/search-goods', 'HomeController@searchGoods');

    //Admin users only
    Route::middleware('admin')->group(function () {
        Route::resource('goods', 'GoodsController', ['except' => ['show']]);
        Route::resource('category', 'CategoryController', ['except' => ['show']]);

        Route::get('/portions/show/{id}', 'PortionsController@index');
        Route::get('/portions/create/{id}', 'PortionsController@create');
        Route::get('/portions/{id}/edit', 'PortionsController@edit');
        Route::post('/portions/store', ['as' => 'portions.store', 'uses' => 'PortionsController@store']);
        Route::post('/portions/update', ['as' => 'portions.update', 'uses' => 'PortionsController@update']);
        Route::post('/portions/delete', ['as' => 'portions.delete', 'uses' => 'PortionsController@delete']);
    });
});